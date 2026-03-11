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

/** Fetch book text: from server for library books, from localStorage for uploaded */
export async function fetchBookText(bookId) {
  const books = getBooks();
  const book = books[bookId];
  if (!book) return null;

  // Library book — fetch from server
  if (book.source === 'library' && book.file) {
    try {
      const resp = await fetch('books/' + book.file);
      if (!resp.ok) return null;

      const ext = book.file.slice(book.file.lastIndexOf('.')).toLowerCase();

      if (ext === '.fb2' || ext === '.txt') {
        const buffer = await resp.arrayBuffer();

        if (ext === '.fb2') {
          const text = decodeFb2Buffer(buffer);
          const doc = new DOMParser().parseFromString(text, 'text/xml');
          const body = doc.querySelector('body');
          if (!body) return null;
          const paragraphs = body.querySelectorAll('p');
          const parts = [];
          paragraphs.forEach(p => {
            const t = p.textContent.trim();
            if (t) parts.push(t);
          });
          return parts.join(' ');
        }

        // Plain text
        try {
          return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
        } catch {
          return new TextDecoder('windows-1251').decode(buffer);
        }
      }

      if (ext === '.epub') {
        const blob = await resp.blob();
        const { parseFile } = await import('./parser.js');
        const file = new File([blob], book.file);
        const result = await parseFile(file);
        return result.words.join(' ');
      }

      // Other formats
      return await resp.text();
    } catch {
      return null;
    }
  }

  // Uploaded book — from localStorage
  return getBookText(bookId);
}

/** Decode FB2 buffer respecting XML encoding declaration */
function decodeFb2Buffer(buffer) {
  const head = new TextDecoder('ascii').decode(buffer.slice(0, 200));
  const encMatch = head.match(/encoding\s*=\s*["']([^"']+)["']/i);
  const declared = encMatch ? encMatch[1].toLowerCase() : '';

  if (declared && declared !== 'utf-8') {
    try {
      return new TextDecoder(declared).decode(buffer);
    } catch {
      return new TextDecoder('windows-1251').decode(buffer);
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1251').decode(buffer);
  }
}

/** Fetch chapter list (title + word index) for FB2 books */
export async function fetchBookChapters(bookId) {
  const books = getBooks();
  const book = books[bookId];
  if (!book) return [];

  if (book.source === 'library' && book.file) {
    const ext = book.file.slice(book.file.lastIndexOf('.')).toLowerCase();
    if (ext !== '.fb2') return [];

    try {
      const resp = await fetch('books/' + book.file);
      if (!resp.ok) return [];
      const buffer = await resp.arrayBuffer();
      const text = decodeFb2Buffer(buffer);
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      const body = doc.querySelector('body');
      if (!body) return [];

      const chapters = [];
      let wordIndex = 0;

      // Walk through all child nodes of body in order
      function walkNodes(parent) {
        for (const node of parent.children) {
          if (node.tagName === 'section') {
            // Look for title inside this section
            for (const child of node.children) {
              if (child.tagName === 'title') {
                const titleText = child.textContent.trim();
                if (titleText) {
                  chapters.push({ title: titleText, wordIndex });
                }
                // Title paragraphs also count as words
                child.querySelectorAll('p').forEach(p => {
                  const t = p.textContent.trim();
                  if (t) wordIndex += t.split(/\s+/).filter(w => w.length > 0).length;
                });
                break;
              }
            }
            // Recurse into section children (skips title since it's already handled)
            walkNodes(node);
          } else if (node.tagName === 'p') {
            const t = node.textContent.trim();
            if (t) {
              wordIndex += t.split(/\s+/).filter(w => w.length > 0).length;
            }
          }
        }
      }

      walkNodes(body);
      return chapters;
    } catch {
      return [];
    }
  }

  return [];
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
    readerFontSize: 18,
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
