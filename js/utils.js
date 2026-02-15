// Вспомогательные функции

/**
 * Генерация уникального ID (UUID v4)
 * @returns {string} UUID
 */
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Форматирование даты в YYYY-MM-DD
 * @param {Date|string} date - Дата
 * @returns {string} Отформатированная дата
 */
function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Получить даты недели (Понедельник - Воскресенье) для указанной даты
 * @param {Date|string} date - Дата
 * @returns {Array} Массив из 7 дат
 */
function getWeekDates(date) {
  const d = typeof date === 'string' ? new Date(date) : new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Понедельник = начало недели

  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);

  const week = [];
  for (let i = 0; i < 7; i++) {
    const current = new Date(monday);
    current.setDate(monday.getDate() + i);
    week.push(formatDate(current));
  }

  return week;
}

/**
 * Округление КБЖУ до 1 знака после запятой
 * @param {object} nutrients - Объект с КБЖУ
 * @returns {object} Округлённые значения
 */
function roundNutrients(nutrients) {
  const result = {};
  for (const [key, value] of Object.entries(nutrients)) {
    if (typeof value === 'number') {
      result[key] = parseFloat(value.toFixed(1));
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Округление калорий вверх до целого числа
 * @param {number} value - Значение калорий
 * @returns {number} Округлённое значение
 */
function roundCaloriesUp(value) {
  return Math.ceil(value);
}

/**
 * Получить дату из URL параметра ?date=
 * @returns {string|null} Дата в формате YYYY-MM-DD или null
 */
function getDateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('date');
}

/**
 * Установить дату в URL параметр ?date=
 * @param {string} date - Дата в формате YYYY-MM-DD
 */
function setDateToUrl(date) {
  const url = new URL(window.location);
  url.searchParams.set('date', date);
  window.history.pushState({}, '', url);
}

/**
 * Конвертация Blob в Base64
 * @param {Blob} blob - Blob объект
 * @returns {Promise<string>} Base64 строка
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Конвертация Base64 в Blob
 * @param {string} base64 - Base64 строка
 * @returns {Blob} Blob объект
 */
function base64ToBlob(base64) {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; i++) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Получить текущую дату в формате YYYY-MM-DD
 * @returns {string} Текущая дата
 */
function getCurrentDate() {
  return formatDate(new Date());
}

/**
 * Получить название дня недели
 * @param {Date|string} date - Дата
 * @param {string} lang - Язык (ru, de)
 * @returns {string} Название дня недели
 */
function getDayName(date, lang = 'ru') {
  const d = typeof date === 'string' ? new Date(date) : date;
  const days = {
    ru: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  };
  return days[lang][d.getDay()];
}

/**
 * Проверка, является ли дата сегодняшней
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @returns {boolean} true если сегодня
 */
function isToday(date) {
  return date === getCurrentDate();
}

/**
 * Debounce функция (задержка выполнения)
 * @param {Function} func - Функция для выполнения
 * @param {number} wait - Время задержки в мс
 * @returns {Function} Debounced функция
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateUUID,
    formatDate,
    getWeekDates,
    roundNutrients,
    roundCaloriesUp,
    getDateFromUrl,
    setDateToUrl,
    blobToBase64,
    base64ToBlob,
    getCurrentDate,
    getDayName,
    isToday,
    debounce
  };
}
