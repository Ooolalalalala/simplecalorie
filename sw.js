// Service Worker для SimpleCalorie PWA

const CACHE_NAME = 'simplecalorie-v3.2';
const urlsToCache = [
  // Корень и главная страница
 'pages/index.html',

  // HTML страницы
  'pages/favorites.html',
  'pages/profile.html',
  'pages/add-product.html',
  'pages/product-card.html',
  'pages/create-dish.html',
  'pages/water.html',

  // CSS файлы
  'css/variables.css',
  'css/main.css',
  'css/components.css',
  'css/favorites.css',
  'css/create-dish.css',
  'css/add-product.css',
  'css/product-card.css',
  'css/profile.css',
  'css/water.css',

  // JavaScript файлы
  'js/utils.js',
  'js/storage.js',
  'js/api.js',
  'js/crypto.js',
  'js/i18n.js',
  'js/app.js',

  // Языковые файлы
  'lang/ru.json',
  'lang/de.json',

  // Данные
  'data/drinks.json',
  // Изображения - напитки
  'images/drinks/water.png',
  'images/drinks/hot.png',
  'images/drinks/juice.png',
  'images/drinks/cola.png',
  'images/drinks/low-calorie.png',
  // иконки
  'images/icon-192.png',
  'images/icon-512.png',

  // Placeholder
  'images/placeholder.png',

  // Конфигурация
  'config/api-config.json',
  'config/prompts.json'
];

// Установка Service Worker
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching app shell');
        // Кэшируем файлы по одному, пропуская ошибки
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch стратегия
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Игнорируем запросы к внешним API
  if (url.hostname === 'api.openai.com' ||
      url.hostname === 'cdnjs.cloudflare.com' ||
      url.protocol === 'chrome-extension:') {
    return;
  }

  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(response => {
        // Возвращаем из кэша если есть
        if (response) {
          return response;
        }

        // Иначе делаем сетевой запрос
        return fetch(event.request).then(
          fetchResponse => {
            // Проверяем что ответ валидный
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }

            // Клонируем ответ
            const responseToCache = fetchResponse.clone();

            // Кэшируем новый ответ (только для GET запросов)
            if (event.request.method === 'GET') {
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }

            return fetchResponse;
          }
        );
      })
      .catch(() => {
        // Если оффлайн и нет в кэше
        if (event.request.destination === 'image') {
          return caches.match('/images/placeholder.png');
        }

        // Для HTML страниц возвращаем главную
        if (event.request.destination === 'document') {
          return caches.match('/pages/index.html');
        }
      })
  );
});

// Сообщения от клиентов
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});





