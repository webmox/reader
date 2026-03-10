import { initShelf, renderShelf } from './shelf.js';
import { initReader, loadBook, pause, togglePlay, jumpWords, jumpSentence, changeSpeed, isBookLoaded, getCurrentState } from './reader.js';
import { initStats, renderStats } from './stats.js';
import { initSettings, syncSettingsUI, applyTheme } from './settings.js';
import { getSettings } from './storage.js';

// Apply saved theme
const settings = getSettings();
applyTheme(settings.theme);

// Init all screens
const shelfScreen = document.getElementById('shelfScreen');
const readerScreen = document.getElementById('readerScreen');
const statsScreen = document.getElementById('statsScreen');
const settingsScreen = document.getElementById('settingsScreen');

initShelf(shelfScreen);
initReader(readerScreen);
initStats(statsScreen);
initSettings(settingsScreen);

// Navigation
const navItems = document.querySelectorAll('.nav-item');
const screens = { shelfScreen, readerScreen, statsScreen, settingsScreen };

function navigate(screenId) {
  // Pause reader if leaving
  const state = getCurrentState();
  if (state.playing && screenId !== 'readerScreen') {
    pause();
  }

  // Switch screens
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenId]?.classList.add('active');

  // Update nav
  navItems.forEach(n => {
    n.classList.toggle('active', n.dataset.screen === screenId);
  });

  // Render target screen
  if (screenId === 'shelfScreen') renderShelf();
  if (screenId === 'statsScreen') renderStats();
  if (screenId === 'settingsScreen') syncSettingsUI();
}

// Expose navigate globally
window.navigate = navigate;

// Open book from shelf
window.openBook = (bookId) => {
  navigate('readerScreen');
  loadBook(bookId);
};

// Nav clicks
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navigate(item.dataset.screen);
  });
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Only on reader screen
  if (!readerScreen.classList.contains('active')) return;
  if (!isBookLoaded()) return;

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
      changeSpeed(50);
      break;
    case 'ArrowDown':
      e.preventDefault();
      changeSpeed(-50);
      break;
  }
});

// Start on shelf
navigate('shelfScreen');

// Register Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
