// Инициализация PWA приложения

// Регистрация Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('../sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful:', registration.scope);
      })
      .catch(err => {
        console.log('ServiceWorker registration failed:', err);
      });
  });
}

// Обработка установки PWA
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Предотвращаем автоматический показ промпта
  e.preventDefault();
  // Сохраняем событие для последующего использования
  deferredPrompt = e;
  console.log('PWA install prompt available');
});

window.addEventListener('appinstalled', () => {
  console.log('PWA installed successfully');
  deferredPrompt = null;
});
