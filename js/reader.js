import { getBooks, saveBooks, getBookText, getStats, saveStats, getSettings } from './storage.js';
import { todayISO, formatNumber, minutesLeft, escapeHTML } from './utils.js';

let container = null;
let words = [];
let bookId = null;
let bookTitle = '';
let index = 0;
let total = 0;
let wpm = 300;
let playing = false;
let timer = null;
let sessionStart = 0;
let sessionWordsStart = 0;

// DOM refs
let wordEl, orpGuideEl, pauseHintEl, contextLineEl;
let progressFill, progressInfo, progressMinutes;
let playBtn, wpmDisplay, speedCurrent;
let focusZone;
let bottomNav;

export function initReader(containerEl) {
  container = containerEl;

  wordEl = container.querySelector('.current-word');
  orpGuideEl = container.querySelector('.orp-guide');
  pauseHintEl = container.querySelector('.pause-hint');
  contextLineEl = container.querySelector('.context-line');
  progressFill = container.querySelector('.reader-progress-fill');
  progressInfo = container.querySelector('.progress-position');
  progressMinutes = container.querySelector('.progress-minutes');
  playBtn = container.querySelector('.play-btn');
  wpmDisplay = container.querySelector('.wpm-display');
  speedCurrent = container.querySelector('.speed-current');
  focusZone = container.querySelector('.focus-zone');
  bottomNav = document.querySelector('.bottom-nav');

  // Focus zone tap → toggle play
  focusZone.addEventListener('click', () => {
    if (words.length > 0) togglePlay();
  });

  // Play button
  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (words.length > 0) togglePlay();
  });

  // Progress bar seek
  const progressBar = container.querySelector('.reader-progress');
  progressBar.addEventListener('click', (e) => {
    const rect = progressBar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekToPercent(pct);
  });

  // Speed buttons
  container.querySelector('.speed-down').addEventListener('click', () => changeSpeed(-50));
  container.querySelector('.speed-up').addEventListener('click', () => changeSpeed(50));

  // Navigation buttons
  container.querySelector('.jump-prev-sentence').addEventListener('click', () => jumpSentence(-1));
  container.querySelector('.jump-prev').addEventListener('click', () => jumpWords(-10));
  container.querySelector('.jump-next').addEventListener('click', () => jumpWords(10));
  container.querySelector('.jump-next-sentence').addEventListener('click', () => jumpSentence(1));

  // Back button
  container.querySelector('.back-btn')?.addEventListener('click', () => {
    if (playing) pause();
    window.navigate?.('shelfScreen');
  });
}

export function loadBook(id) {
  const books = getBooks();
  const book = books[id];
  if (!book) return;

  const text = getBookText(id);
  if (!text) {
    alert('Текст книги не найден. Загрузите заново.');
    return;
  }

  bookId = id;
  bookTitle = book.title;
  words = text.split(' ');
  total = words.length;
  index = book.index || 0;
  wpm = book.wpm || getSettings().defaultWpm;

  if (index >= total) index = 0;

  // Show reader UI
  container.querySelector('.no-book-msg').style.display = 'none';
  container.querySelector('.reader-content').style.display = 'flex';

  container.querySelector('.reader-title').textContent = bookTitle;
  updateWpmDisplay();
  updateProgressUI();
  renderWord();

  pauseHintEl.classList.add('visible');
  playing = false;
  updatePlayBtn();

  const settings = getSettings();
  wordEl.style.fontSize = settings.fontSize + 'px';
  orpGuideEl.classList.toggle('hidden', !settings.showORP);
  contextLineEl.classList.toggle('hidden', !settings.showContext);
}

export function play() {
  if (!words.length || playing) return;
  playing = true;
  sessionStart = Date.now();
  sessionWordsStart = index;
  pauseHintEl.classList.remove('visible');
  updatePlayBtn();
  bottomNav?.classList.add('hidden');
  tick();
}

export function pause() {
  if (!playing) return;
  playing = false;
  clearTimeout(timer);
  pauseHintEl.classList.add('visible');
  updatePlayBtn();
  bottomNav?.classList.remove('hidden');
  recordSession();
}

export function togglePlay() {
  if (playing) pause(); else play();
}

export function jumpWords(delta) {
  const wasPaused = !playing;
  if (playing) {
    clearTimeout(timer);
  }
  index = Math.max(0, Math.min(total - 1, index + delta));
  renderWord();
  updateProgressUI();
  saveProgress();
  if (playing) tick();
}

export function jumpSentence(direction) {
  if (direction < 0) {
    // Go back to start of previous sentence
    let i = Math.max(0, index - 1);
    // skip current sentence end
    while (i > 0 && /[.!?…]$/.test(words[i])) i--;
    // find previous sentence end
    while (i > 0 && !/[.!?…]$/.test(words[i])) i--;
    // move to word after the period
    if (i > 0) i++;
    index = i;
  } else {
    // Go to start of next sentence
    let i = index;
    while (i < total - 1 && !/[.!?…]$/.test(words[i])) i++;
    if (i < total - 1) i++;
    index = i;
  }
  renderWord();
  updateProgressUI();
  saveProgress();
  if (playing) {
    clearTimeout(timer);
    tick();
  }
}

export function changeSpeed(delta) {
  wpm = Math.max(50, Math.min(1500, wpm + delta));
  updateWpmDisplay();
  saveProgress();
  if (playing) {
    clearTimeout(timer);
    tick();
  }
}

export function seekToPercent(percent) {
  index = Math.max(0, Math.min(total - 1, Math.floor(percent * total)));
  renderWord();
  updateProgressUI();
  saveProgress();
  if (playing) {
    clearTimeout(timer);
    tick();
  }
}

export function getCurrentState() {
  return { bookId, title: bookTitle, playing, wpm, index, total };
}

export function isBookLoaded() {
  return words.length > 0;
}

// ── Internal ──

function getORPIndex(word) {
  if (word.length <= 1) return 0;
  if (word.length <= 3) return 0;
  return Math.floor(word.length * 0.3);
}

function getDelay(word, baseDelay) {
  const settings = getSettings();
  if (settings.periodPause && /[.!?…]$/.test(word)) return baseDelay * 2.5;
  if (settings.commaPause && /[,;:\u2014\u2013]$/.test(word)) return baseDelay * 1.5;
  if (word.length > 8) return baseDelay * 1.2;
  return baseDelay;
}

function tick() {
  if (!playing || index >= total) {
    if (index >= total) {
      pause();
    }
    return;
  }

  renderWord();
  updateProgressUI();

  const baseDelay = 60000 / wpm;
  const delay = getDelay(words[index], baseDelay);

  index++;

  timer = setTimeout(tick, delay);
}

function renderWord() {
  if (index >= total) {
    wordEl.innerHTML = '';
    return;
  }

  const word = words[index];
  const settings = getSettings();

  if (settings.showORP) {
    const orpIdx = getORPIndex(word);
    const before = escapeHTML(word.slice(0, orpIdx));
    const orpChar = escapeHTML(word[orpIdx] || '');
    const after = escapeHTML(word.slice(orpIdx + 1));
    wordEl.innerHTML = `${before}<span class="orp-char">${orpChar}</span>${after}`;

    // Position word so ORP char aligns with center guide
    const containerWidth = wordEl.parentElement.offsetWidth;
    if (containerWidth > 0 && word.length > 0) {
      const charWidth = 1 / word.length;
      const orpCenter = (orpIdx + 0.5) / word.length;
      const shiftPercent = 0.5 - orpCenter;
      wordEl.style.transform = `translateX(${shiftPercent * 100}%)`;
    }
  } else {
    wordEl.textContent = word;
    wordEl.style.transform = 'translateX(0)';
  }

  // Context line
  if (settings.showContext) {
    const start = Math.max(0, index - 4);
    const end = Math.min(total, index + 5);
    const ctx = words.slice(start, end).map((w, i) => {
      const realIdx = start + i;
      if (realIdx === index) return `<strong>${escapeHTML(w)}</strong>`;
      return escapeHTML(w);
    }).join(' ');
    contextLineEl.innerHTML = ctx;
  }
}

function updateProgressUI() {
  if (total === 0) return;
  const pct = (index / total * 100).toFixed(1);
  progressFill.style.width = pct + '%';
  progressInfo.textContent = `${formatNumber(index)} / ${formatNumber(total)}`;
  const remaining = total - index;
  progressMinutes.textContent = `~${minutesLeft(remaining, wpm)} мин`;
}

function updateWpmDisplay() {
  if (wpmDisplay) wpmDisplay.textContent = wpm + ' wpm';
  if (speedCurrent) speedCurrent.textContent = wpm + ' wpm';
}

function updatePlayBtn() {
  if (playBtn) {
    playBtn.textContent = playing ? '⏸' : '▶';
  }
}

function saveProgress() {
  if (!bookId) return;
  const books = getBooks();
  if (books[bookId]) {
    books[bookId].index = index;
    books[bookId].wpm = wpm;
    books[bookId].updatedAt = Date.now();
    saveBooks(books);
  }
}

function recordSession() {
  if (!bookId) return;
  const sessionWords = Math.max(0, index - sessionWordsStart);
  const sessionMinutes = (Date.now() - sessionStart) / 60000;

  if (sessionWords === 0) return;

  // Update stats
  const stats = getStats();
  const today = todayISO();
  if (!stats.daily[today]) {
    stats.daily[today] = { words: 0, minutes: 0, sessions: 0 };
  }
  stats.daily[today].words += sessionWords;
  stats.daily[today].minutes += sessionMinutes;
  stats.daily[today].sessions += 1;
  stats.totalWords += sessionWords;
  stats.totalMinutes += sessionMinutes;
  stats.totalSessions += 1;
  saveStats(stats);

  // Update book
  const books = getBooks();
  if (books[bookId]) {
    books[bookId].wordsRead = (books[bookId].wordsRead || 0) + sessionWords;
    books[bookId].sessions = (books[bookId].sessions || 0) + 1;
    books[bookId].index = index;
    books[bookId].wpm = wpm;
    books[bookId].updatedAt = Date.now();
    saveBooks(books);
  }
}
