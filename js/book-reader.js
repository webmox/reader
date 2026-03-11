import { getBooks, saveBooks, fetchBookText, getSettings } from './storage.js';
import { formatNumber, escapeHTML } from './utils.js';

let container = null;
let words = [];
let bookId = null;
let bookTitle = '';
let total = 0;

// Pagination
let pages = [];
let currentPage = 0;
let wordsPerPage = 200; // will be recalculated

// DOM refs
let pageContent, pageInfo, pageProgress, pageProgressFill;
let prevBtn, nextBtn;
let bottomNav;

// Touch
let touchStartX = 0;
let touchStartY = 0;

export function initBookReader(containerEl) {
  container = containerEl;
  pageContent = container.querySelector('.page-content');
  pageInfo = container.querySelector('.page-info');
  pageProgress = container.querySelector('.page-progress');
  pageProgressFill = container.querySelector('.page-progress-fill');
  prevBtn = container.querySelector('.page-prev');
  nextBtn = container.querySelector('.page-next');
  bottomNav = document.querySelector('.bottom-nav');

  prevBtn.addEventListener('click', () => goPage(-1));
  nextBtn.addEventListener('click', () => goPage(1));

  // Swipe support
  pageContent.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  pageContent.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goPage(1);  // swipe left → next
      else goPage(-1);         // swipe right → prev
    }
  }, { passive: true });

  // Back button
  container.querySelector('.book-back-btn')?.addEventListener('click', () => {
    savePosition();
    window.navigate?.('shelfScreen');
  });

  // Progress bar seek
  pageProgress.addEventListener('click', (e) => {
    const rect = pageProgress.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    currentPage = Math.floor(pct * pages.length);
    currentPage = Math.max(0, Math.min(pages.length - 1, currentPage));
    renderPage();
    savePosition();
  });
}

export async function loadBookForReading(id) {
  const books = getBooks();
  const book = books[id];
  if (!book) return;

  const text = await fetchBookText(id);
  if (!text) {
    alert('Текст книги не найден. Загрузите заново.');
    return;
  }

  bookId = id;
  bookTitle = book.title;
  words = text.split(' ');
  total = words.length;

  container.querySelector('.book-reader-title').textContent = bookTitle;
  container.querySelector('.no-book-msg-br').style.display = 'none';
  container.querySelector('.book-reader-content').style.display = 'flex';

  paginate();

  // Restore position from word index
  const savedIndex = book.index || 0;
  currentPage = findPageByWordIndex(savedIndex);
  renderPage();
}

export function isBookReaderLoaded() {
  return words.length > 0;
}

export function goPage(delta) {
  const newPage = currentPage + delta;
  if (newPage < 0 || newPage >= pages.length) return;
  currentPage = newPage;
  renderPage();
  savePosition();
  pageContent.scrollTop = 0;
}

export function applyBookReaderSettings() {
  const settings = getSettings();
  pageContent.style.fontSize = settings.readerFontSize
    ? settings.readerFontSize + 'px'
    : '18px';
  // Re-paginate on font change
  if (words.length > 0) {
    const savedWordIdx = pages[currentPage]?.start || 0;
    paginate();
    currentPage = findPageByWordIndex(savedWordIdx);
    renderPage();
  }
}

// ── Internal ──

function paginate() {
  // Estimate words per page based on container size
  const rect = pageContent.getBoundingClientRect();
  const fontSize = parseFloat(getComputedStyle(pageContent).fontSize) || 18;
  const lineHeight = fontSize * 1.7;
  const charsPerLine = Math.floor(rect.width / (fontSize * 0.55));
  const linesPerPage = Math.floor(rect.height / lineHeight);
  wordsPerPage = Math.max(20, Math.floor(charsPerLine * linesPerPage / 6));

  pages = [];
  for (let i = 0; i < total; i += wordsPerPage) {
    pages.push({
      start: i,
      end: Math.min(total, i + wordsPerPage),
    });
  }

  if (pages.length === 0) {
    pages.push({ start: 0, end: 0 });
  }
}

function findPageByWordIndex(wordIndex) {
  for (let i = pages.length - 1; i >= 0; i--) {
    if (pages[i].start <= wordIndex) return i;
  }
  return 0;
}

function renderPage() {
  if (pages.length === 0) return;

  const page = pages[currentPage];
  const text = words.slice(page.start, page.end).join(' ');
  pageContent.innerHTML = `<p>${escapeHTML(text)}</p>`;

  // Page info
  pageInfo.textContent = `${currentPage + 1} / ${pages.length}`;

  // Progress
  const pct = pages.length > 1
    ? ((currentPage / (pages.length - 1)) * 100).toFixed(1)
    : '100';
  pageProgressFill.style.width = pct + '%';

  // Button states
  prevBtn.disabled = currentPage === 0;
  nextBtn.disabled = currentPage >= pages.length - 1;
}

function savePosition() {
  if (!bookId) return;
  const books = getBooks();
  if (books[bookId] && pages[currentPage]) {
    books[bookId].index = pages[currentPage].start;
    books[bookId].updatedAt = Date.now();
    saveBooks(books);
  }
}
