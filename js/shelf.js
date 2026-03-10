import { getBooks, saveBooks, saveBookText, deleteBook, getSettings } from './storage.js';
import { parseFile } from './parser.js';
import { simpleHash, hashToHue, formatNumber, escapeHTML } from './utils.js';

let container = null;
let shelfList = null;
let fileInput = null;
let loadingOverlay = null;

// Confirm dialog
let confirmOverlay = null;
let confirmTitle = null;
let confirmText = null;
let confirmOk = null;
let confirmCancel = null;

export function initShelf(containerEl) {
  container = containerEl;
  shelfList = container.querySelector('.shelf-list');
  fileInput = container.querySelector('.book-file-input');
  loadingOverlay = document.getElementById('loadingOverlay');
  confirmOverlay = document.getElementById('confirmOverlay');
  confirmTitle = confirmOverlay.querySelector('.confirm-title');
  confirmText = confirmOverlay.querySelector('.confirm-text');
  confirmOk = confirmOverlay.querySelector('.confirm-ok');
  confirmCancel = confirmOverlay.querySelector('.confirm-cancel');

  // File input
  container.querySelector('.add-book-btn').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) await loadFiles(files);
    fileInput.value = '';
  });

  // Drag & drop
  const scrollArea = container.querySelector('.screen-scroll');
  scrollArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    scrollArea.classList.add('shelf-dragover');
  });
  scrollArea.addEventListener('dragleave', () => {
    scrollArea.classList.remove('shelf-dragover');
  });
  scrollArea.addEventListener('drop', async (e) => {
    e.preventDefault();
    scrollArea.classList.remove('shelf-dragover');
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) await loadFiles(files);
  });

  // Confirm cancel
  confirmCancel.addEventListener('click', () => {
    confirmOverlay.classList.remove('visible');
  });
}

export function renderShelf() {
  const books = getBooks();
  const bookList = Object.entries(books).sort((a, b) => (b[1].updatedAt || b[1].addedAt) - (a[1].updatedAt || a[1].addedAt));

  // Shelf stats
  const totalBooks = bookList.length;
  const totalWords = bookList.reduce((s, [, b]) => s + (b.wordsRead || 0), 0);
  const reading = bookList.filter(([, b]) => b.index > 0 && b.index < b.total).length;

  container.querySelector('.shelf-stat-books').textContent = totalBooks;
  container.querySelector('.shelf-stat-words').textContent = formatNumber(totalWords);
  container.querySelector('.shelf-stat-reading').textContent = reading;

  // Empty state
  if (bookList.length === 0) {
    shelfList.innerHTML = `
      <div class="empty-shelf">
        <div class="empty-shelf-icon">📚</div>
        <div class="empty-shelf-text">Полка пуста</div>
      </div>
    `;
    return;
  }

  shelfList.innerHTML = bookList.map(([id, book]) => {
    const pct = book.total > 0 ? Math.round(book.index / book.total * 100) : 0;
    let chipClass, chipLabel;
    if (book.index === 0) {
      chipClass = 'chip-warning';
      chipLabel = 'Новая';
    } else if (pct >= 100) {
      chipClass = 'chip-success';
      chipLabel = 'Прочитана';
    } else {
      chipClass = 'chip-accent';
      chipLabel = pct + '%';
    }

    return `
      <div class="book-card" data-book-id="${id}">
        <div class="book-cover" style="background:hsla(${book.hue},70%,50%,0.15)">📄</div>
        <div class="book-info">
          <div class="book-title">${escapeHTML(book.title)}</div>
          <div class="book-meta">
            <span>${formatNumber(book.total)} слов</span>
            <span class="chip ${chipClass}">${chipLabel}</span>
          </div>
          <div class="book-progress">
            <div class="book-progress-fill" style="width:${pct}%"></div>
          </div>
        </div>
        <button class="book-delete" data-delete-id="${id}" title="Удалить">✕</button>
      </div>
    `;
  }).join('');

  // Click handlers
  shelfList.querySelectorAll('.book-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.book-delete')) return;
      const id = card.dataset.bookId;
      window.openBook?.(id);
    });
  });

  shelfList.querySelectorAll('.book-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.deleteId;
      const books = getBooks();
      const title = books[id]?.title || 'книгу';
      showConfirm('Удалить книгу?', `«${title}» будет удалена.`, () => {
        deleteBook(id);
        renderShelf();
      });
    });
  });
}

async function loadFiles(files) {
  loadingOverlay.classList.add('visible');
  const books = getBooks();
  const settings = getSettings();

  for (const file of files) {
    try {
      const { title, words } = await parseFile(file);
      const id = 'b_' + simpleHash(title + words.length);

      // Don't overwrite existing book progress
      if (!books[id]) {
        books[id] = {
          title,
          total: words.length,
          index: 0,
          wpm: settings.defaultWpm,
          addedAt: Date.now(),
          updatedAt: Date.now(),
          wordsRead: 0,
          sessions: 0,
          hue: hashToHue(title),
        };
      }

      saveBookText(id, words.join(' '));
    } catch (err) {
      alert('Ошибка при чтении «' + file.name + '»: ' + err.message);
    }
  }

  saveBooks(books);
  loadingOverlay.classList.remove('visible');
  renderShelf();
}

function showConfirm(title, text, onOk) {
  confirmTitle.textContent = title;
  confirmText.textContent = text;
  confirmOverlay.classList.add('visible');

  const handler = () => {
    confirmOverlay.classList.remove('visible');
    confirmOk.removeEventListener('click', handler);
    onOk();
  };
  // Remove old listeners
  const newOk = confirmOk.cloneNode(true);
  confirmOk.parentNode.replaceChild(newOk, confirmOk);
  confirmOk = newOk;
  confirmOk.addEventListener('click', handler);

  // Re-bind cancel
  const newCancel = confirmCancel.cloneNode(true);
  confirmCancel.parentNode.replaceChild(newCancel, confirmCancel);
  confirmCancel = newCancel;
  confirmCancel.addEventListener('click', () => {
    confirmOverlay.classList.remove('visible');
  });
}
