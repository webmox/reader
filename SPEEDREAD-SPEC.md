# SpeedRead — RSVP Speed Reading PWA

## Как использовать этот документ

Это полная спецификация проекта. Положи файл `SPEC.md` в пустую папку проекта и скажи AI-ассистенту:

> "Прочитай SPEC.md и создай проект по этой спецификации. Создай все файлы и папки согласно описанной структуре."

---

## Общее описание

PWA-приложение для скорочтения методом RSVP (Rapid Serial Visual Presentation). Показывает по одному слову из загруженной книги с настраиваемой скоростью. Работает полностью на клиенте, без бэкенда. Хостится как статический сайт (GitHub Pages, Netlify, или любой статик-хостинг).

---

## Стек технологий

- Чистый HTML + CSS + Vanilla JS (ES6 modules)
- Никаких фреймворков (React, Vue и т.д. — НЕ использовать)
- Никаких сборщиков (Webpack, Vite и т.д. — НЕ использовать)
- JS-модули подключаются через `<script type="module">`
- Внешние зависимости (CDN):
  - Google Fonts: JetBrains Mono + DM Sans
  - JSZip: `https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js` (для парсинга .epub)

---

## Структура проекта

```
speedread/
├── index.html              # Точка входа, подключение стилей и скриптов
├── manifest.json           # PWA-манифест
├── sw.js                   # Service Worker (кеширование для офлайн)
├── SPEC.md                 # Этот файл
│
├── css/
│   ├── variables.css       # CSS-переменные (цвета, шрифты, размеры)
│   ├── base.css            # Сброс стилей, html/body, типографика
│   ├── components.css      # Переиспользуемые компоненты (toggle, chip, card, stepper, icon-btn, confirm-dialog)
│   ├── nav.css             # Нижняя навигация
│   ├── shelf.css           # Экран "Книжная полка"
│   ├── reader.css          # Экран "Чтение"
│   ├── stats.css           # Экран "Статистика"
│   └── settings.css        # Экран "Настройки"
│
├── js/
│   ├── app.js              # Инициализация приложения, навигация между экранами
│   ├── storage.js          # Обёртка над localStorage: чтение/запись книг, настроек, статистики
│   ├── parser.js           # Парсинг файлов: .txt, .epub, .fb2
│   ├── reader.js           # Логика RSVP: воспроизведение, пауза, навигация, ORP
│   ├── shelf.js            # Рендер книжной полки, загрузка файлов
│   ├── stats.js            # Рендер статистики, графиков, серий
│   ├── settings.js         # Управление настройками
│   └── utils.js            # Вспомогательные функции (хеш, форматирование, escapeHTML)
│
├── icons/
│   ├── icon-192.png        # Иконка PWA 192×192
│   └── icon-512.png        # Иконка PWA 512×512
│
└── books/                  # Папка для хранения примеров книг (опционально)
    └── .gitkeep
```

---

## index.html

```html
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="SpeedRead">
  <meta name="theme-color" content="#08080a">
  <title>SpeedRead — RSVP Reader</title>

  <link rel="manifest" href="manifest.json">
  <link rel="apple-touch-icon" href="icons/icon-192.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">

  <!-- CSS -->
  <link rel="stylesheet" href="css/variables.css">
  <link rel="stylesheet" href="css/base.css">
  <link rel="stylesheet" href="css/components.css">
  <link rel="stylesheet" href="css/nav.css">
  <link rel="stylesheet" href="css/shelf.css">
  <link rel="stylesheet" href="css/reader.css">
  <link rel="stylesheet" href="css/stats.css">
  <link rel="stylesheet" href="css/settings.css">

  <!-- JSZip для парсинга epub -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
</head>
<body>

  <div id="app">
    <!-- Все 4 экрана живут здесь. HTML каждого экрана описан ниже -->
  </div>

  <!-- Загрузочный оверлей -->
  <div class="loading-overlay" id="loadingOverlay">...</div>

  <!-- Диалог подтверждения -->
  <div class="confirm-overlay" id="confirmOverlay">...</div>

  <script type="module" src="js/app.js"></script>
</body>
</html>
```

---

## manifest.json

```json
{
  "name": "SpeedRead — RSVP Reader",
  "short_name": "SpeedRead",
  "description": "Скорочтение методом RSVP",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#08080a",
  "theme_color": "#08080a",
  "orientation": "portrait",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

---

## sw.js (Service Worker)

Кеширует все файлы приложения для офлайн-работы:
- Стратегия: Cache First (для CSS/JS/шрифтов), Network First (для index.html)
- При установке — предзагрузить все файлы из списка
- Версионирование: менять имя кеша (`speedread-v1`, `speedread-v2`) при обновлениях
- При активации — удалять старые кеши

Файлы для кеширования:
```
/, /index.html,
/css/variables.css, /css/base.css, /css/components.css, /css/nav.css,
/css/shelf.css, /css/reader.css, /css/stats.css, /css/settings.css,
/js/app.js, /js/storage.js, /js/parser.js, /js/reader.js,
/js/shelf.js, /js/stats.js, /js/settings.js, /js/utils.js,
/icons/icon-192.png, /icons/icon-512.png, /manifest.json
```

---

## Модуль js/utils.js

Экспортируемые функции:

```js
export function escapeHTML(str)     // Создаёт текстовый узел, возвращает безопасный HTML
export function formatNumber(n)     // Форматирование числа: 12345 → "12 345" (ru-RU locale)
export function todayISO()          // Возвращает "2026-03-11" (текущая дата ISO без времени)
export function simpleHash(str)     // Простой хеш строки → base36 строка (для ID книг)
export function hashToHue(str)      // Хеш строки → число 0-360 (для цвета обложки)
export function minutesLeft(words, wpm) // Оставшиеся минуты: Math.ceil(words / wpm)
```

---

## Модуль js/storage.js

Единый API для работы с localStorage. Все остальные модули работают с данными только через этот модуль.

```js
// Ключи в localStorage:
// 'sr_books'     — JSON-объект со всеми книгами
// 'sr_t_{id}'    — текст книги (raw string, НЕ JSON)
// 'sr_stats'     — JSON-объект со статистикой
// 'sr_settings'  — JSON-объект с настройками

// ── Книги ──
export function getBooks()                      // → объект {id: bookData, ...}
export function saveBooks(books)                // Сохранить весь объект книг
export function getBookText(bookId)             // → строка с текстом (сырой текст, не JSON)
export function saveBookText(bookId, text)      // Сохранить текст книги
export function deleteBook(bookId)              // Удалить книгу + её текст

// ── Статистика ──
export function getStats()                      // → объект статистики
export function saveStats(stats)                // Сохранить статистику
export function getDefaultStats()               // → начальный объект: {daily:{}, totalWords:0, totalMinutes:0, totalSessions:0}

// ── Настройки ──
export function getSettings()                   // → объект с настройками (с дефолтами)
export function saveSettings(settings)          // Сохранить настройки
export function getDefaultSettings()            // → {theme:'dark', fontSize:48, showContext:true, showORP:true, defaultWpm:300, commaPause:true, periodPause:true}

// ── Полный сброс ──
export function resetAll()                      // Удалить всё из localStorage, относящееся к приложению
```

---

## Модуль js/parser.js

Парсинг файлов книг. Возвращает массив слов.

```js
export async function parseFile(file) // Принимает File объект → возвращает {title: string, words: string[]}
```

Внутренняя логика:
- Определить формат по расширению (.txt, .epub, .fb2)
- .txt → `file.text()`, split по /\s+/
- .epub → JSZip: container.xml → .opf → spine order → HTML файлы → body.textContent
- .fb2 → DOMParser, text/xml, найти `<body>`, все `<p>`, склеить textContent
- Название книги = имя файла без расширения
- Отфильтровать пустые строки после split

---

## Модуль js/reader.js

Ядро RSVP-ридера. Управляет воспроизведением слов.

### Экспортируемые функции

```js
export function initReader(containerEl)     // Привязать DOM-элементы экрана чтения
export function loadBook(bookId)            // Загрузить книгу из storage и подготовить к чтению
export function play()                      // Начать/продолжить воспроизведение
export function pause()                     // Пауза (сохраняет прогресс, записывает сессию)
export function togglePlay()                // Переключить play/pause
export function jumpWords(delta)            // Перемотка на ±N слов (по умолчанию 10)
export function jumpSentence(direction)     // Перейти к началу предыдущего/следующего предложения
export function changeSpeed(delta)          // Изменить WPM на ±delta (по умолчанию 50)
export function seekToPercent(percent)      // Перейти к позиции 0.0–1.0
export function getCurrentState()           // → {bookId, title, playing, wpm, index, total}
export function isBookLoaded()              // → boolean
```

### ORP (Optimal Recognition Point)

Функция для определения позиции "красной буквы":

```js
function getORPIndex(word) {
  if (word.length <= 1) return 0;
  if (word.length <= 3) return 0;
  return Math.floor(word.length * 0.3);
}
```

Рендер слова с ORP:
- До ORP-буквы — обычный цвет
- ORP-буква — `<span class="orp-char">` (красный цвет var(--focus-red))
- После ORP-буквы — обычный цвет

### Задержка между словами

```js
function getDelay(word, baseDelay) {
  // baseDelay = 60000 / wpm
  if (settings.periodPause && /[.!?…]$/.test(word)) return baseDelay * 2.5;
  if (settings.commaPause && /[,;:—–]$/.test(word)) return baseDelay * 1.5;
  if (word.length > 8) return baseDelay * 1.2;
  return baseDelay;
}
```

### Учёт сессии

При вызове `pause()`:
1. Посчитать sessionWords (сколько слов показано с момента play)
2. Посчитать время: (Date.now() - sessionStart) / 60000 минут
3. Обновить stats.daily[today], stats.total*
4. Обновить books[bookId].wordsRead, .sessions, .index
5. Сохранить через storage.js

### Навигация по предложениям

- **Предыдущее:** от текущей позиции идти назад, найти слово с `.!?…` на конце, перейти на слово ПОСЛЕ него
- **Следующее:** от текущей позиции идти вперёд, найти слово с `.!?…` на конце, перейти на слово ПОСЛЕ него

---

## Модуль js/shelf.js

Отвечает за рендер книжной полки и загрузку файлов.

```js
export function initShelf(containerEl)   // Привязать DOM и события
export function renderShelf()            // Перерисовать список книг
```

### Загрузка файлов
- `<input type="file">` с атрибутом `multiple`
- Drag & drop на весь экран полки
- При загрузке: показать loading overlay, вызвать parser.js, сохранить через storage.js
- ID книги: `'b_' + simpleHash(title + wordCount)` — для дедупликации
- Если книга уже есть (тот же ID) — не перезаписывать прогресс

### Карточка книги
- Цветной индикатор: `hsl(book.hue, 70%, 50%)` с opacity 15%
- Иконка 📄
- Название (text-overflow: ellipsis)
- Мета: "580 000 слов"
- Чип статуса: "Новая" (warning) / "45%" (accent) / "Прочитана" (success)
- Прогресс-бар (тонкая полоска 3px)
- Кнопка удаления ✕ → confirm dialog → storage.deleteBook()
- Клик по карточке → переход на экран чтения, загрузка книги

---

## Модуль js/stats.js

```js
export function initStats(containerEl)
export function renderStats()
```

### Три карточки-героя
- Слов прочитано (accent) — stats.totalWords
- Минут чтения (success) — Math.round(stats.totalMinutes)
- Средний WPM (warning) — totalWords / totalMinutes (или 0)

### Серия (streak)
- Последние 7 дней
- Названия дней: Пн, Вт, Ср, Чт, Пт, Сб, Вс
- День активен если stats.daily[date].words > 0
- Текущий день — с рамкой
- Подсчёт серии: от сегодня назад, считать последовательные активные дни

### График (14 дней)
- 14 столбиков (div), высота пропорциональна max-значению
- При hover — показать число над столбиком (data-атрибут + CSS ::after)
- Под столбиками — числа дат

### По книгам
- Список книг с wordsRead > 0, отсортировано по wordsRead убыванию
- Каждая строка: иконка, название, "X сессий · Y wpm", бейдж "Z сл."

---

## Модуль js/settings.js

```js
export function initSettings(containerEl)
export function syncSettingsUI()             // Синхронизировать UI с текущими settings
```

### Группы настроек

**Тема:**
- Тёмная тема — toggle. При переключении: добавить/убрать класс `.light-theme` на body, обновить meta theme-color

**Отображение:**
- Размер шрифта — stepper, 24–80, шаг 4
- Контекстная строка — toggle
- ORP-маркер — toggle

**Скорость по умолчанию:**
- WPM — stepper, 50–1500, шаг 50. Применяется только к новым книгам

**Паузы на пунктуации:**
- Запятые — toggle. "×1.5 для , ; : —"
- Точки — toggle. "×2.5 для . ! ? …"

**Сброс:**
- Кнопка → confirm dialog → storage.resetAll() → перезагрузить состояние всех экранов

---

## Модуль js/app.js

Точка входа. Инициализация приложения.

```js
import { initShelf, renderShelf } from './shelf.js';
import { initReader } from './reader.js';
import { initStats } from './stats.js';
import { initSettings } from './settings.js';
import { getSettings } from './storage.js';

// 1. Применить тему из сохранённых настроек
// 2. Инициализировать все 4 экрана (привязать DOM)
// 3. Настроить навигацию (tab bar)
// 4. Отрисовать стартовый экран (полку)
// 5. Зарегистрировать Service Worker
// 6. Навесить горячие клавиши для экрана чтения
```

### Навигация между экранами

```js
function navigate(screenId) {
  // 1. Если идёт чтение и уходим с ридера — поставить на паузу
  // 2. Убрать .active у всех экранов, добавить нужному
  // 3. Обновить подсветку tab bar
  // 4. Вызвать render для целевого экрана (renderShelf / renderStats / syncSettingsUI)
}
```

Навигация: 4 кнопки в нижней панели, data-screen атрибут определяет целевой экран.

---

## Дизайн-система

### CSS-переменные (css/variables.css)

```css
:root {
  /* Тёмная тема (по умолчанию) */
  --bg: #08080a;
  --bg-secondary: #111114;
  --bg-tertiary: #1a1a1e;
  --surface: #222228;
  --border: #28282f;
  --text: #e8e6e3;
  --text-muted: #7a7880;
  --text-dim: #4a4850;
  --accent: #c8ff00;
  --accent-glow: rgba(200,255,0,.12);
  --accent-mid: rgba(200,255,0,.06);
  --focus-red: #ff3b5c;
  --success: #00d68f;
  --warning: #ffaa00;

  /* Размеры */
  --radius: 16px;
  --radius-sm: 10px;
  --radius-xs: 6px;
  --nav-height: 64px;

  /* Шрифты */
  --font-display: 'JetBrains Mono', monospace;
  --font-body: 'DM Sans', sans-serif;

  /* Safe area */
  --safe-top: env(safe-area-inset-top, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
}

.light-theme {
  --bg: #f4f2ed;
  --bg-secondary: #eae7e0;
  --bg-tertiary: #dfdbd3;
  --surface: #d4d0c7;
  --border: #cac6bc;
  --text: #18171a;
  --text-muted: #6b6862;
  --text-dim: #9b9890;
  --accent: #5a2fc2;
  --accent-glow: rgba(90,47,194,.1);
  --accent-mid: rgba(90,47,194,.05);
  --focus-red: #d42050;
  --success: #0a9960;
  --warning: #cc8800;
}
```

### Типографика
- Display/mono: JetBrains Mono — слово RSVP, WPM, лейблы, цифры, счётчики
- Body: DM Sans — текст интерфейса, описания, названия книг

### UI-компоненты (css/components.css)

**Toggle:** 48×28px, border-radius 14px, кружок 22×22px белый, transition 0.3s
**Stepper:** две кнопки 30×30px по бокам, значение по центру mono-шрифтом
**Chip:** padding 4px 10px, border-radius 20px, font 11px mono bold. Варианты: accent, success, warning
**Card:** bg-secondary, border, radius 16px, hover → bg-tertiary
**Icon button:** 40×40px, radius 10px, border
**Confirm dialog:** overlay с blur(6px), модальное окно с двумя кнопками

### Все тексты интерфейса — на русском языке

---

## Структура данных в localStorage

### sr_books (JSON)
```json
{
  "b_abc123": {
    "title": "Война и мир",
    "total": 580000,
    "index": 12500,
    "wpm": 350,
    "addedAt": 1710000000000,
    "updatedAt": 1710050000000,
    "wordsRead": 8000,
    "sessions": 5,
    "hue": 210
  }
}
```

### sr_t_{bookId} (raw string, НЕ JSON)
Все слова книги через пробел.

### sr_stats (JSON)
```json
{
  "daily": {
    "2026-03-11": { "words": 5000, "minutes": 18.5, "sessions": 2 }
  },
  "totalWords": 45000,
  "totalMinutes": 180.5,
  "totalSessions": 25
}
```

### sr_settings (JSON)
```json
{
  "theme": "dark",
  "fontSize": 48,
  "showContext": true,
  "showORP": true,
  "defaultWpm": 300,
  "commaPause": true,
  "periodPause": true
}
```

---

## Описание экранов (HTML-структура)

### Экран 1: Книжная полка (shelfScreen) — стартовый

```
screen-header: "Книжная полка" (слово "полка" — accent)
shelf-stats: три мини-карточки [Книг | Слов | Читаю]
screen-scroll:
  add-book-btn: "📂 Загрузить книгу" (со скрытым input file)
  shelfList: список book-card
    book-card: cover-icon | info (title, meta, progress-bar) | delete-btn
  empty-shelf: (если книг нет) иконка + "Полка пуста"
```

### Экран 2: Чтение (readerScreen)

```
screen-header: back-btn | reader-title | wpm-display
no-book-msg: (если книга не загружена) "Выбери книгу на полке"
focus-zone: (основная область, тап = play/pause)
  word-container:
    orp-guide: вертикальная красная линия по центру
    current-word: текущее слово с ORP-разметкой
  pause-hint: "ПАУЗА · нажми для продолжения"
  context-line: ~9 окружающих слов
reader-controls:
  progress-bar: кликабельная полоска перемотки
  progress-info: "12,345 / 98,765" | "~32 мин"
  main-controls: ⏮ ↶ ▶ ↷ ⏭
  speed-controls: "−50" | "300 wpm" | "+50"
  keyboard-hints: (только десктоп)
```

### Экран 3: Статистика (statsScreen)

```
screen-header: "Статистика" (часть слова — accent)
stats-hero: три карточки [Слов прочитано | Минут | Сред. WPM]
screen-scroll:
  streak-bar: "🔥 Серия: X дней" + 7 ячеек по дням
  history-chart: "Слов за день (14 дней)" + столбиковая диаграмма
  section-label: "По книгам"
  book-stats-list: книга → иконка, название, сессии, wpm, wordsRead
```

### Экран 4: Настройки (settingsScreen)

```
screen-header: "Настройки" (часть слова — accent)
screen-scroll:
  section: Тема → toggle "Тёмная тема"
  section: Отображение → stepper "Размер шрифта" + toggle "Контекстная строка" + toggle "ORP-маркер"
  section: Скорость → stepper "WPM по умолчанию"
  section: Паузы → toggle "Запятые ×1.5" + toggle "Точки ×2.5"
  reset-btn: "Сбросить все данные" (красная кнопка)
  app-version: "SpeedRead v2.0"
```

### Нижняя навигация

```
bottom-nav: (фиксированная внизу)
  nav-item[shelfScreen]: 📚 Полка
  nav-item[readerScreen]: 👁 Чтение
  nav-item[statsScreen]: 📊 Статистика
  nav-item[settingsScreen]: ⚙️ Настройки
```

Скрывается классом `.hidden` при активном чтении, появляется при паузе.

---

## Горячие клавиши (только экран чтения, только десктоп)

| Клавиша | Действие |
|---------|----------|
| Space | Play / Pause |
| ← | −10 слов |
| → | +10 слов |
| ↑ | +50 WPM |
| ↓ | −50 WPM |

---

## Адаптивность

- < 380px: уменьшить отступы
- < 768px: скрыть подсказки клавиш
- ≥ 768px: показать подсказки клавиш

---

## Поведение при ошибках

- Не удалось прочитать файл → alert с сообщением
- Файл пустой → alert "Файл пустой"
- Текст книги не найден в localStorage → alert "Загрузите заново"
- Все ошибки localStorage оборачиваются в try/catch

---

## Папка books/

Пустая папка с `.gitkeep`. Пользователь может положить туда свои .txt/.epub/.fb2 файлы для удобства. Приложение НЕ читает файлы из этой папки автоматически — только через UI загрузки.

---

## Деплой на GitHub Pages

1. Создать репозиторий на GitHub
2. Запушить проект
3. Settings → Pages → Source: main branch, / (root)
4. Через минуту сайт доступен по адресу `https://username.github.io/speedread`
5. На iPhone: открыть в Safari → "Поделиться" → "На экран Домой"

---

## Будущее развитие (НЕ реализовывать сейчас)

Эти фичи НЕ нужно делать в первой версии. Они здесь для контекста:
- Закладки внутри книги
- Экспорт/импорт данных (JSON backup)
- Оглавление для .epub
- Цели чтения (X минут/день)
- Capacitor-обёртка для App Store
