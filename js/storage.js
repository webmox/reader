// Keys:
// 'sr_books'     — JSON object with all books
// 'sr_t_{id}'    — book text (raw string, NOT JSON)
// 'sr_stats'     — JSON object with statistics
// 'sr_settings'  — JSON object with settings

// ── Books ──

export function getBooks() {
  try {
    return JSON.parse(localStorage.getItem('sr_books')) || {};
  } catch {
    return {};
  }
}

export function saveBooks(books) {
  try {
    localStorage.setItem('sr_books', JSON.stringify(books));
  } catch (e) {
    console.error('Failed to save books:', e);
  }
}

export function getBookText(bookId) {
  try {
    return localStorage.getItem('sr_t_' + bookId) || null;
  } catch {
    return null;
  }
}

export function saveBookText(bookId, text) {
  try {
    localStorage.setItem('sr_t_' + bookId, text);
  } catch (e) {
    console.error('Failed to save book text:', e);
  }
}

export function deleteBook(bookId) {
  try {
    const books = getBooks();
    delete books[bookId];
    saveBooks(books);
    localStorage.removeItem('sr_t_' + bookId);
  } catch (e) {
    console.error('Failed to delete book:', e);
  }
}

// ── Stats ──

export function getDefaultStats() {
  return { daily: {}, totalWords: 0, totalMinutes: 0, totalSessions: 0 };
}

export function getStats() {
  try {
    return JSON.parse(localStorage.getItem('sr_stats')) || getDefaultStats();
  } catch {
    return getDefaultStats();
  }
}

export function saveStats(stats) {
  try {
    localStorage.setItem('sr_stats', JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

// ── Settings ──

export function getDefaultSettings() {
  return {
    theme: 'dark',
    fontSize: 48,
    showContext: true,
    showORP: true,
    showGuide: true,
    defaultWpm: 300,
    commaPause: true,
    periodPause: true,
    commaMultiplier: 1.5,
    periodMultiplier: 2.5,
    autoPauseSentence: false,
    warmup: false,
    warmupStartWpm: 150,
    warmupDuration: 30,
    sessionTimer: false,
    sessionTimerMinutes: 15,
  };
}

export function getSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem('sr_settings'));
    return { ...getDefaultSettings(), ...saved };
  } catch {
    return getDefaultSettings();
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem('sr_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save settings:', e);
  }
}

// ── Full reset ──

export function resetAll() {
  try {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sr_')) {
        keys.push(key);
      }
    }
    keys.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.error('Failed to reset:', e);
  }
}
