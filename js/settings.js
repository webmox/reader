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

  // Show guide line toggle
  bindToggle('guide-toggle', (active) => {
    const s = getSettings();
    s.showGuide = active;
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

  // Book reader font size stepper
  bindStepper('reader-font-stepper', 12, 32, 2, (val) => {
    const s = getSettings();
    s.readerFontSize = val;
    saveSettings(s);
  });

  // Default WPM stepper
  bindStepper('wpm-stepper', 50, 1500, 10, (val) => {
    const s = getSettings();
    s.defaultWpm = val;
    saveSettings(s);
  });

  // Comma multiplier stepper
  bindStepperFloat('comma-mult-stepper', 1.0, 5.0, 0.5, (val) => {
    const s = getSettings();
    s.commaMultiplier = val;
    saveSettings(s);
  });

  // Period multiplier stepper
  bindStepperFloat('period-mult-stepper', 1.0, 5.0, 0.5, (val) => {
    const s = getSettings();
    s.periodMultiplier = val;
    saveSettings(s);
  });

  // Auto-pause on sentence end toggle
  bindToggle('autopause-toggle', (active) => {
    const s = getSettings();
    s.autoPauseSentence = active;
    saveSettings(s);
  });

  // Warmup toggle
  bindToggle('warmup-toggle', (active) => {
    const s = getSettings();
    s.warmup = active;
    saveSettings(s);
  });

  // Warmup start WPM stepper
  bindStepper('warmup-wpm-stepper', 50, 500, 10, (val) => {
    const s = getSettings();
    s.warmupStartWpm = val;
    saveSettings(s);
  });

  // Warmup duration stepper
  bindStepper('warmup-duration-stepper', 5, 120, 5, (val) => {
    const s = getSettings();
    s.warmupDuration = val;
    saveSettings(s);
  });

  // Session timer toggle
  bindToggle('timer-toggle', (active) => {
    const s = getSettings();
    s.sessionTimer = active;
    saveSettings(s);
  });

  // Session timer minutes stepper
  bindStepper('timer-minutes-stepper', 1, 120, 1, (val) => {
    const s = getSettings();
    s.sessionTimerMinutes = val;
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
  setToggle('guide-toggle', s.showGuide);
  setToggle('comma-toggle', s.commaPause);
  setToggle('period-toggle', s.periodPause);
  setToggle('autopause-toggle', s.autoPauseSentence);
  setToggle('warmup-toggle', s.warmup);
  setToggle('timer-toggle', s.sessionTimer);

  setStepperValue('font-stepper', s.fontSize);
  setStepperValue('reader-font-stepper', s.readerFontSize);
  setStepperValue('wpm-stepper', s.defaultWpm);
  setStepperValue('comma-mult-stepper', s.commaMultiplier);
  setStepperValue('period-mult-stepper', s.periodMultiplier);
  setStepperValue('warmup-wpm-stepper', s.warmupStartWpm);
  setStepperValue('warmup-duration-stepper', s.warmupDuration);
  setStepperValue('timer-minutes-stepper', s.sessionTimerMinutes);
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

function bindStepperFloat(id, min, max, step, onChange) {
  const el = container.querySelector(`[data-stepper="${id}"]`);
  if (!el) return;
  const valueEl = el.querySelector('.stepper-value');
  const minusBtn = el.querySelector('.stepper-minus');
  const plusBtn = el.querySelector('.stepper-plus');

  minusBtn.addEventListener('click', () => {
    let val = Math.round((parseFloat(valueEl.textContent) - step) * 10) / 10;
    val = Math.max(min, val);
    valueEl.textContent = val.toFixed(1);
    onChange(val);
  });

  plusBtn.addEventListener('click', () => {
    let val = Math.round((parseFloat(valueEl.textContent) + step) * 10) / 10;
    val = Math.min(max, val);
    valueEl.textContent = val.toFixed(1);
    onChange(val);
  });
}

function setStepperValue(id, val) {
  const el = container.querySelector(`[data-stepper="${id}"]`);
  if (!el) return;
  const isFloat = typeof val === 'number' && val % 1 !== 0;
  el.querySelector('.stepper-value').textContent = isFloat ? val.toFixed(1) : val;
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
