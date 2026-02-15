// Работа с GPT API

let apiConfig = null;
let prompts = null;

/**
 * Загрузка конфигурации API
 * @returns {Promise<object>} Конфигурация
 */
async function loadConfig() {
  if (apiConfig) return apiConfig;

  try {
    const response = await fetch('../config/api-config.json');
    apiConfig = await response.json();
    return apiConfig;
  } catch (error) {
    console.error('Error loading API config:', error);
    // Fallback конфигурация
    return {
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 1000
    };
  }
}

/**
 * Загрузка промптов
 * @returns {Promise<object>} Промпты
 */
async function loadPrompts() {
  if (prompts) return prompts;

  try {
    const response = await fetch('../config/prompts.json');
    prompts = await response.json();
    return prompts;
  } catch (error) {
    console.error('Error loading prompts:', error);
    throw new Error('Failed to load prompts');
  }
}

/**
 * Проверка наличия API ключа
 * @returns {boolean} true если ключ есть
 */
function checkApiKey() {
  return !!sessionStorage.getItem('apiKey');
}

/**
 * Получение API ключа
 * @returns {string|null} API ключ
 */
function getApiKey() {
  return sessionStorage.getItem('apiKey');
}

/**
 * Низкоуровневый вызов GPT API
 * @param {Array} messages - Массив сообщений
 * @param {object} config - Конфигурация
 * @returns {Promise<object>} Ответ от API
 */
 async function callGPT(messages, config) {
   const apiKey = getApiKey();
   if (!apiKey) {
     throw new Error('API key not found');
   }

   const response = await fetch('https://api.openai.com/v1/chat/completions', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${apiKey}`
     },
     body: JSON.stringify({
       model: config.model,
       max_tokens: config.max_tokens,
       temperature: config.temperature,
       messages: messages
     })
   });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'API request failed');
  }

  return response.json();
}

/**
 * Парсинг JSON ответа от GPT
 * @param {object} response - Ответ от API
 * @returns {object} Распарсенные данные продукта
 */
 function parseGPTResponse(response) {
   try {
     // Извлекаем текст из ответа OpenAI
     const content = response.choices[0].message.content;

    // Удаляем markdown если есть
    const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();

    // Парсим JSON
    const data = JSON.parse(cleanContent);

    // Валидация обязательных полей
    if (!data.name || typeof data.calories !== 'number') {
      throw new Error('Invalid response format');
    }

    // Округление до 1 знака
    return {
      name: data.name,
      calories: parseFloat(data.calories.toFixed(1)),
      protein: parseFloat((data.protein || 0).toFixed(1)),
      fat: parseFloat((data.fat || 0).toFixed(1)),
      carbs: parseFloat((data.carbs || 0).toFixed(1)),
      sugar: parseFloat((data.sugar || 0).toFixed(1)),
      amount: data.amount,   //  || 100,
      unit: data.unit || 'g'
    };
  } catch (error) {
    console.error('Error parsing GPT response:', error);
    throw new Error('Failed to parse AI response');
  }
}

/**
 * Анализ продукта (универсальный режим)
 * @param {Array<string>} photos - Массив base64 фото (до 2шт)
 * @param {string} name - Название (опционально)
 * @param {number} volume - Объём (опционально)
 * @param {string} comment - Комментарий (опционально)
 * @returns {Promise<object>} Данные продукта
 */
async function analyzeProduct(photos = [], name = '', volume = null, unit = '', comment = '') {
  const config = await loadConfig();
  const promptsData = await loadPrompts();

  // Формируем контент сообщения
  const content = [];

  // Добавляем фото (OpenAI формат)
    photos.forEach((photoBase64) => {
      content.push({
        type: 'image_url',
        image_url: {
          url: photoBase64
        }
      });
    });

  // Формируем текстовую часть
    let textPrompt = promptsData.analyzeProduct;

    if (name) {
      textPrompt += `\nProduct name: ${name}`;
    }
    if (volume && unit) {
      textPrompt += `\nWeight/Volume: ${volume}${unit}`;
    }
    if (comment) {
      textPrompt += `\nAdditional info: ${comment}`;
    }

  content.push({
    type: 'text',
    text: textPrompt
  });

  // Вызов API
  const response = await callGPT([
    { role: 'user', content: content }
  ], config);

  return parseGPTResponse(response);
}

/**
 * Анализ по таблице пищевой ценности
 * @param {string} photoTable - Base64 фото таблицы (обязательно)
 * @param {string} photoDish - Base64 фото блюда (опционально)
 * @param {string} name - Название (опционально)
 * @param {number} volume - Объём (опционально)
 * @param {string} comment - Комментарий (опционально)
 * @returns {Promise<object>} Данные продукта
 */
async function analyzeTable(photoTable, photoDish = null, name = '', volume = null, unit = '', comment = '') {
  const config = await loadConfig();
  const promptsData = await loadPrompts();

  const content = [];

  // Добавляем фото таблицы (обязательно) - OpenAI формат
    content.push({
      type: 'image_url',
      image_url: {
        url: photoTable
      }
    });

    // Добавляем фото блюда (опционально) - OpenAI формат
    if (photoDish) {
      content.push({
        type: 'image_url',
        image_url: {
          url: photoDish
        }
      });
    }

    // Формируем текстовую часть
      let textPrompt = promptsData.analyzeTable;

      if (name) {
        textPrompt += `\nProduct name: ${name}`;
      }
      if (volume && unit) {
        textPrompt += `\nWeight/Volume: ${volume}${unit}`;
      }
      if (comment) {
        textPrompt += `\nAdditional info: ${comment}`;
      }

  content.push({
    type: 'text',
    text: textPrompt
  });

  // Вызов API
  const response = await callGPT([
    { role: 'user', content: content }
  ], config);

  return parseGPTResponse(response);
}

/**
 * Создание временного продукта с лоадером
 * @param {string} name - Название (или "Загрузка...")
 * @returns {object} Временный продукт
 */
function createLoadingProduct(name = 'Загрузка...') {
  return {
    id: generateUUID(),
    name: name,
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    sugar: 0,
    amount: 0,
    unit: 'g',
    category: '',
    photo: null,
    loading: true,
    timestamp: Date.now()
  };
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadConfig,
    loadPrompts,
    checkApiKey,
    getApiKey,
    callGPT,
    parseGPTResponse,
    analyzeProduct,
    analyzeTable,
    createLoadingProduct
  };
}
