export function escapeHTML(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

export function formatNumber(n) {
  return n.toLocaleString('ru-RU');
}

export function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + ch;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export function hashToHue(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function minutesLeft(words, wpm) {
  if (!wpm || wpm <= 0) return 0;
  return Math.ceil(words / wpm);
}
