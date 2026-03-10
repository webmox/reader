import { getStats, getBooks } from './storage.js';
import { todayISO, formatNumber } from './utils.js';

let container = null;

export function initStats(containerEl) {
  container = containerEl;
}

export function renderStats() {
  const stats = getStats();
  const books = getBooks();

  // Hero cards
  const avgWpm = stats.totalMinutes > 0 ? Math.round(stats.totalWords / stats.totalMinutes) : 0;
  container.querySelector('.stat-total-words').textContent = formatNumber(stats.totalWords);
  container.querySelector('.stat-total-minutes').textContent = formatNumber(Math.round(stats.totalMinutes));
  container.querySelector('.stat-avg-wpm').textContent = formatNumber(avgWpm);

  // Streak
  renderStreak(stats);

  // Chart
  renderChart(stats);

  // Book stats
  renderBookStats(books);
}

function renderStreak(stats) {
  const today = new Date();
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const todayStr = todayISO();

  // Compute streak
  let streak = 0;
  const d = new Date(today);
  while (true) {
    const iso = d.toISOString().slice(0, 10);
    if (stats.daily[iso] && stats.daily[iso].words > 0) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }

  container.querySelector('.streak-count').textContent = streak;

  // Last 7 days cells
  const daysContainer = container.querySelector('.streak-days');
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(today);
    dd.setDate(dd.getDate() - i);
    const iso = dd.toISOString().slice(0, 10);
    const dayName = dayNames[dd.getDay()];
    const active = stats.daily[iso] && stats.daily[iso].words > 0;
    const isToday = iso === todayStr;

    html += `
      <div class="streak-day">
        <span class="streak-day-label">${dayName}</span>
        <div class="streak-day-dot${active ? ' active' : ''}${isToday ? ' today' : ''}">
          ${active ? '✓' : ''}
        </div>
      </div>
    `;
  }
  daysContainer.innerHTML = html;
}

function renderChart(stats) {
  const today = new Date();
  const days = [];

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    const dayData = stats.daily[iso];
    days.push({
      date: d.getDate(),
      words: dayData ? dayData.words : 0,
    });
  }

  const maxWords = Math.max(1, ...days.map(d => d.words));
  const barsContainer = container.querySelector('.chart-bars');
  const labelsContainer = container.querySelector('.chart-labels');

  barsContainer.innerHTML = days.map(d => {
    const h = Math.max(2, (d.words / maxWords) * 100);
    return `
      <div class="chart-bar-wrap">
        <div class="chart-bar" style="height:${h}%" data-value="${formatNumber(d.words)}"></div>
      </div>
    `;
  }).join('');

  labelsContainer.innerHTML = days.map(d => `<span class="chart-label">${d.date}</span>`).join('');
}

function renderBookStats(books) {
  const list = Object.entries(books)
    .filter(([, b]) => (b.wordsRead || 0) > 0)
    .sort((a, b) => (b[1].wordsRead || 0) - (a[1].wordsRead || 0));

  const listEl = container.querySelector('.book-stats-list');

  if (list.length === 0) {
    listEl.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px">Нет данных</div>';
    return;
  }

  listEl.innerHTML = list.map(([, book]) => {
    const avgWpm = book.sessions > 0 ? Math.round((book.wordsRead || 0) / Math.max(1, book.sessions)) : 0;
    return `
      <div class="book-stat-row">
        <span class="book-stat-icon">📄</span>
        <div class="book-stat-info">
          <div class="book-stat-title">${escapeHTML(book.title)}</div>
          <div class="book-stat-meta">${book.sessions || 0} сессий · ${book.wpm || 0} wpm</div>
        </div>
        <span class="book-stat-badge">${formatNumber(book.wordsRead || 0)} сл.</span>
      </div>
    `;
  }).join('');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}
