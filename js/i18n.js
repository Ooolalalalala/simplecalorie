// Система мультиязычности

let currentLang = localStorage.getItem('lang') || 'ru';
let translations = {};

/**
 * Загрузка переводов для указанного языка
 * @param {string} lang - Код языка (ru, de)
 */
async function loadTranslations(lang) {
  try {
    const response = await fetch(`../lang/${lang}.json`);
    if (!response.ok) {
      throw new Error(`Failed to load ${lang}.json`);
    }
    translations = await response.json();
    currentLang = lang;
    localStorage.setItem('lang', lang);
    return true;
  } catch (error) {
    console.error('Error loading translations:', error);
    // Fallback to Russian
    if (lang !== 'ru') {
      return loadTranslations('ru');
    }
    return false;
  }
}

/**
 * Получить перевод по ключу
 * @param {string} key - Ключ перевода (например, "navigation.home")
 * @param {object} params - Параметры для подстановки (опционально)
 * @returns {string} Переведённая строка
 */
function t(key, params = {}) {
  const keys = key.split('.');
  let value = translations;

  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      console.warn(`Translation not found: ${key}`);
      return key;
    }
  }

  if (typeof value !== 'string') {
    console.warn(`Translation is not a string: ${key}`);
    return key;
  }

  // Подстановка параметров {param}
  let result = value;
  for (const [param, val] of Object.entries(params)) {
    result = result.replace(`{${param}}`, val);
  }

  return result;
}

/**
 * Переключить язык и перезагрузить страницу
 * @param {string} lang - Код языка
 */
async function setLanguage(lang) {
  await loadTranslations(lang);
  location.reload();
}

/**
 * Получить текущий язык
 * @returns {string} Код текущего языка
 */
function getCurrentLanguage() {
  return currentLang;
}

/**
 * Применить переводы ко всем элементам с data-i18n
 */
 function applyTranslations() {
   document.querySelectorAll('[data-i18n]:not(option)').forEach(element => {
     const key = element.dataset.i18n;
     const translation = t(key);

     // Для input placeholder
     if (element.tagName === 'INPUT' && element.hasAttribute('placeholder')) {
       element.placeholder = translation;
     }
     // Для обычных элементов
     else {
       element.textContent = translation;
     }
   });

   // Применить переводы для <option>
   document.querySelectorAll('option[data-i18n]').forEach(element => {
     const key = element.dataset.i18n;
     const translation = t(key);
     if (translation) {
       element.textContent = translation;
     }
   });

   // Применить переводы для data-i18n-placeholder
   document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
     const key = element.dataset.i18nPlaceholder;
     element.placeholder = t(key);
   });

  // Применить переводы для data-i18n-html (для HTML содержимого)
  document.querySelectorAll('[data-i18n-html]').forEach(element => {
    const key = element.dataset.i18nHtml;
    element.innerHTML = t(key);
  });
}

/**
 * Инициализация системы переводов при загрузке страницы
 */
async function initI18n() {
  await loadTranslations(currentLang);
  applyTranslations();
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { t, setLanguage, getCurrentLanguage, initI18n, loadTranslations, applyTranslations };
}
