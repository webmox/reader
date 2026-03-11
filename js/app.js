import { initShelf, renderShelf } from './shelf.js';
import { initReader, loadBook, pause, togglePlay, jumpWords, jumpSentence, changeSpeed, isBookLoaded, getCurrentState, applySettings } from './reader.js';
import { initBookReader, loadBookForReading, isBookReaderLoaded, goPage } from './book-reader.js';
import { initStats, renderStats } from './stats.js';
import { initSettings, syncSettingsUI, applyTheme } from './settings.js';
import { getSettings } from './storage.js';

// Apply saved theme
const settings = getSettings();
applyTheme(settings.theme);

// Init all screens
const shelfScreen = document.getElementById('shelfScreen');
const readerScreen = document.getElementById('readerScreen');
const bookReaderScreen = document.getElementById('bookReaderScreen');
const statsScreen = document.getElementById('statsScreen');
const settingsScreen = document.getElementById('settingsScreen');

initShelf(shelfScreen);
initReader(readerScreen);
initBookReader(bookReaderScreen);
initStats(statsScreen);
initSettings(settingsScreen);

// Track current book ID for mode switching
let currentBookId = null;

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const screens = { shelfScreen, readerScreen, bookReaderScreen, statsScreen, settingsScreen };

function navigate(screenId) {
  // Pause RSVP reader if leaving
  const state = getCurrentState();
  if (state.playing && screenId !== 'readerScreen') {
    pause();
  }

  // Switch screens
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenId]?.classList.add('active');

  // Update nav — bookReaderScreen maps to readerScreen nav item
  const navScreenId = screenId === 'bookReaderScreen' ? 'readerScreen' : screenId;
  navItems.forEach(n => {
    n.classList.toggle('active', n.dataset.screen === navScreenId);
  });

  // Render target screen
  if (screenId === 'shelfScreen') renderShelf();
  if (screenId === 'readerScreen' && isBookLoaded()) applySettings();
  if (screenId === 'statsScreen') renderStats();
  if (screenId === 'settingsScreen') syncSettingsUI();
}

// Expose navigate globally
window.navigate = navigate;

// Open book from shelf — default to RSVP mode
window.openBook = (bookId) => {
  currentBookId = bookId;
  navigate('readerScreen');
  loadBook(bookId);
};

// Mode toggle: RSVP → Book
readerScreen.querySelector('.mode-toggle-btn').addEventListener('click', () => {
  if (!currentBookId) return;
  const state = getCurrentState();
  if (state.playing) pause();
  navigate('bookReaderScreen');
  loadBookForReading(currentBookId);
});

// Mode toggle: Book → RSVP
bookReaderScreen.querySelector('.mode-toggle-btn-rsvp').addEventListener('click', () => {
  if (!currentBookId) return;
  navigate('readerScreen');
  loadBook(currentBookId);
});

// Nav clicks
navItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.screen;
    // If clicking "Чтение" and we're in book reader, stay in book reader
    if (target === 'readerScreen' && bookReaderScreen.classList.contains('active')) {
      return;
    }
    navigate(target);
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // RSVP reader shortcuts
  if (readerScreen.classList.contains('active') && isBookLoaded()) {
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        jumpWords(-10);
        break;
      case 'ArrowRight':
        e.preventDefault();
        jumpWords(10);
        break;
      case 'ArrowUp':
        e.preventDefault();
        changeSpeed(10);
        break;
      case 'ArrowDown':
        e.preventDefault();
        changeSpeed(-10);
        break;
    }
    return;
  }

  // Book reader shortcuts
  if (bookReaderScreen.classList.contains('active') && isBookReaderLoaded()) {
    switch (e.code) {
      case 'ArrowLeft':
        e.preventDefault();
        goPage(-1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        goPage(1);
        break;
    }
  }
});

// Start on shelf
navigate('shelfScreen');

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
