import { getSettings, saveSettings, resetAll } from './storage.js';

let container = null;
let confirmOverlay = null;

export function initSettings(containerEl) {
  container = containerEl;
  confirmOverlay = document.getElementById('confirmOverlay');

  // Theme toggle
  bindToggle('theme-toggle', (active) => {
    const s = getSettings();
    s.theme = active ? 'dark' : 'light';
    saveSettings(s);
    applyTheme(s.theme);
  });

  // Show context toggle
  bindToggle('context-toggle', (active) => {
    const s = getSettings();
    s.showContext = active;
    saveSettings(s);
  });

  // Show ORP toggle
  bindToggle('orp-toggle', (active) => {
    const s = getSettings();
    s.showORP = active;
    saveSettings(s);
  });

  // Comma pause toggle
  bindToggle('comma-toggle', (active) => {
    const s = getSettings();
    s.commaPause = active;
    saveSettings(s);
  });

  // Period pause toggle
  bindToggle('period-toggle', (active) => {
    const s = getSettings();
    s.periodPause = active;
    saveSettings(s);
  });

  // Font size stepper
  bindStepper('font-stepper', 24, 80, 4, (val) => {
    const s = getSettings();
    s.fontSize = val;
    saveSettings(s);
  });

  // Default WPM stepper
  bindStepper('wpm-stepper', 50, 1500, 50, (val) => {
    const s = getSettings();
    s.defaultWpm = val;
    saveSettings(s);
  });

  // Reset button
  container.querySelector('.reset-btn').addEventListener('click', () => {
    showConfirm('Сбросить все данные?', 'Книги, статистика и настройки будут удалены.', () => {
      resetAll();
      applyTheme('dark');
      syncSettingsUI();
      window.navigate?.('shelfScreen');
    });
  });
}

export function syncSettingsUI() {
  const s = getSettings();

  setToggle('theme-toggle', s.theme === 'dark');
  setToggle('context-toggle', s.showContext);
  setToggle('orp-toggle', s.showORP);
  setToggle('comma-toggle', s.commaPause);
  setToggle('period-toggle', s.periodPause);

  setStepperValue('font-stepper', s.fontSize);
  setStepperValue('wpm-stepper', s.defaultWpm);
}

export function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('light-theme');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f4f2ed');
  } else {
    document.body.classList.remove('light-theme');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#08080a');
  }
}

// ── Helpers ──

function bindToggle(id, onChange) {
  const el = container.querySelector(`[data-toggle="${id}"]`);
  if (!el) return;
  el.addEventListener('click', () => {
    el.classList.toggle('active');
    onChange(el.classList.contains('active'));
  });
}

function setToggle(id, active) {
  const el = container.querySelector(`[data-toggle="${id}"]`);
  if (!el) return;
  el.classList.toggle('active', active);
}

function bindStepper(id, min, max, step, onChange) {
  const el = container.querySelector(`[data-stepper="${id}"]`);
  if (!el) return;
  const valueEl = el.querySelector('.stepper-value');
  const minusBtn = el.querySelector('.stepper-minus');
  const plusBtn = el.querySelector('.stepper-plus');

  minusBtn.addEventListener('click', () => {
    let val = parseInt(valueEl.textContent) - step;
    val = Math.max(min, val);
    valueEl.textContent = val;
    onChange(val);
  });

  plusBtn.addEventListener('click', () => {
    let val = parseInt(valueEl.textContent) + step;
    val = Math.min(max, val);
    valueEl.textContent = val;
    onChange(val);
  });
}

function setStepperValue(id, val) {
  const el = container.querySelector(`[data-stepper="${id}"]`);
  if (!el) return;
  el.querySelector('.stepper-value').textContent = val;
}

function showConfirm(title, text, onOk) {
  const confirmTitle = confirmOverlay.querySelector('.confirm-title');
  const confirmText = confirmOverlay.querySelector('.confirm-text');

  confirmTitle.textContent = title;
  confirmText.textContent = text;
  confirmOverlay.classList.add('visible');

  const okBtn = confirmOverlay.querySelector('.confirm-ok');
  const cancelBtn = confirmOverlay.querySelector('.confirm-cancel');

  const newOk = okBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  newOk.addEventListener('click', () => {
    confirmOverlay.classList.remove('visible');
    onOk();
  });

  const newCancel = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  newCancel.addEventListener('click', () => {
    confirmOverlay.classList.remove('visible');
  });
}
