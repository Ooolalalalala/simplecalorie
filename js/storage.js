// Работа с IndexedDB

const DB_NAME = 'SimpleCalorie';
const DB_VERSION = 1;
let db = null;

/**
 * Инициализация базы данных
 * @returns {Promise<IDBDatabase>} База данных
 */
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Таблица days
      if (!database.objectStoreNames.contains('days')) {
        const daysStore = database.createObjectStore('days', { keyPath: 'id' });
        daysStore.createIndex('date', 'id', { unique: true });
      }

      // Таблица goals
      if (!database.objectStoreNames.contains('goals')) {
        const goalsStore = database.createObjectStore('goals', { keyPath: 'id', autoIncrement: true });
        goalsStore.createIndex('startDate', 'startDate', { unique: false });
      }

      // Таблица favorites
      if (!database.objectStoreNames.contains('favorites')) {
        const favStore = database.createObjectStore('favorites', { keyPath: 'id' });
        favStore.createIndex('sortOrder', 'sortOrder', { unique: false });
        favStore.createIndex('addedDate', 'addedDate', { unique: false });
      }
    };
  });
}

// ======================
// РАБОТА С ДНЯМИ
// ======================

/**
 * Получить данные дня
 * @param {string} date - Дата в формате YYYY-MM-DD
 * @returns {Promise<object|null>} Данные дня или null
 */
async function getDayData(date) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['days'], 'readonly');
    const store = transaction.objectStore('days');
    const request = store.get(date);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        // Создаём пустой день
        resolve({
          id: date,
          goalId: null,
          products: [],
          waterIntake: 0
        });
      }
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Добавить продукт в день
 * @param {string} date - Дата
 * @param {object} product - Продукт
 * @returns {Promise<object>} Обновлённые данные дня
 */
async function addProductToDay(date, product) {
  const dayData = await getDayData(date);

  // Добавляем продукт В НАЧАЛО массива (новые сверху)
  dayData.products.unshift({
    ...product,
    id: product.id || generateUUID(),
    timestamp: Date.now()
  });

  // Обновляем воду если напиток (ml или l)
  if (product.category === 'drinks' && product.amount) {
    if (product.unit === 'l') {
      dayData.waterIntake += product.amount * 1000; // литры в мл
    } else {
      dayData.waterIntake += product.amount; // мл
    }
  }

  // Сохраняем
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['days'], 'readwrite');
    const store = transaction.objectStore('days');
    const request = store.put(dayData);

    request.onsuccess = () => resolve(dayData);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Обновить продукт в дне
 * @param {string} date - Дата
 * @param {string} productId - ID продукта
 * @param {object} updates - Обновления
 * @returns {Promise<object>} Обновлённые данные дня
 */
async function updateProductInDay(date, productId, updates) {
  const dayData = await getDayData(date);

  const productIndex = dayData.products.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    throw new Error('Product not found');
  }

  const oldProduct = dayData.products[productIndex];

  // Обновляем продукт
  dayData.products[productIndex] = {
    ...oldProduct,
    ...updates
  };

  // Пересчитываем воду если категория изменилась
    if (oldProduct.category === 'drinks') {
      if (oldProduct.unit === 'l') {
        dayData.waterIntake -= (oldProduct.amount || 0) * 1000;
      } else {
        dayData.waterIntake -= oldProduct.amount || 0;
      }
    }
    if (updates.category === 'drinks') {
      if (updates.unit === 'l') {
        dayData.waterIntake += (updates.amount || 0) * 1000;
      } else {
        dayData.waterIntake += updates.amount || 0;
      }
    }

  // Сохраняем
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['days'], 'readwrite');
    const store = transaction.objectStore('days');
    const request = store.put(dayData);

    request.onsuccess = () => resolve(dayData);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Удалить продукт из дня
 * @param {string} date - Дата
 * @param {string} productId - ID продукта
 * @returns {Promise<object>} Обновлённые данные дня
 */
async function deleteProductFromDay(date, productId) {
  const dayData = await getDayData(date);

  const productIndex = dayData.products.findIndex(p => p.id === productId);
  if (productIndex === -1) {
    throw new Error('Product not found');
  }

  const product = dayData.products[productIndex];

  // Убираем из воды если напиток
    if (product.category === 'drinks' && product.amount) {
      if (product.unit === 'l') {
        dayData.waterIntake -= product.amount * 1000;
      } else {
        dayData.waterIntake -= product.amount;
      }
    }

  // Удаляем продукт
  dayData.products.splice(productIndex, 1);

  // Сохраняем
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['days'], 'readwrite');
    const store = transaction.objectStore('days');
    const request = store.put(dayData);

    request.onsuccess = () => resolve(dayData);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Обновить количество воды за день
 * @param {string} date - Дата
 * @param {number} amount - Количество воды (мл)
 * @returns {Promise<object>} Обновлённые данные дня
 */
async function updateWaterIntake(date, amount) {
  const dayData = await getDayData(date);
  dayData.waterIntake += amount;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['days'], 'readwrite');
    const store = transaction.objectStore('days');
    const request = store.put(dayData);

    request.onsuccess = () => resolve(dayData);
    request.onerror = () => reject(request.error);
  });
}

// ======================
// РАБОТА С ЦЕЛЯМИ
// ======================

/**
 * Получить цель для конкретной даты
 * @param {string} date - Дата
 * @returns {Promise<object|null>} Цель или null
 */
 async function getGoalForDate(date) {
   if (!db) await initDB();

   return new Promise((resolve, reject) => {
     const transaction = db.transaction(['goals'], 'readonly');
     const store = transaction.objectStore('goals');
     const index = store.index('startDate');
     const request = index.openCursor(IDBKeyRange.upperBound(date), 'prev');

     request.onsuccess = () => {
       const cursor = request.result;
       if (cursor) {
         resolve(cursor.value);
       } else {
         resolve(null);
       }
     };
     request.onerror = () => reject(request.error);
   });
 }

/**
 * Получить текущую цель
 * @returns {Promise<object|null>} Текущая цель
 */
async function getCurrentGoal() {
  return getGoalForDate(getCurrentDate());
}

/**
 * Создать новую цель
 * @param {object} goalData - Данные цели (calories, protein, fat, carbs, sugar, water)
 * @returns {Promise<object>} Созданная цель
 */
async function updateGoal(goalData) {
  if (!db) await initDB();

  const newGoal = {
    startDate: getCurrentDate(),
    calories: goalData.calories || 2000,
    protein: goalData.protein || 100,
    fat: goalData.fat || 70,
    carbs: goalData.carbs || 250,
    sugar: goalData.sugar || 50,
    water: goalData.water || 2000
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['goals'], 'readwrite');
    const store = transaction.objectStore('goals');
    const request = store.add(newGoal);

    request.onsuccess = () => {
      newGoal.id = request.result;
      resolve(newGoal);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Получить все цели
 * @returns {Promise<Array>} Массив целей
 */
async function getAllGoals() {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['goals'], 'readonly');
    const store = transaction.objectStore('goals');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ======================
// РАБОТА С ИЗБРАННЫМ
// ======================

/**
 * Добавить в избранное
 * @param {object} product - Продукт
 * @returns {Promise<object>} Добавленный продукт
 */
async function addToFavorites(product) {
  if (!db) await initDB();

  // Получаем максимальный sortOrder
  const allFavorites = await getAllFavorites();
  const maxOrder = allFavorites.length > 0
    ? Math.max(...allFavorites.map(f => f.sortOrder || 0))
    : 0;

  const favoriteProduct = {
    ...product,
    id: product.id || generateUUID(),
    addedDate: getCurrentDate(),
    timestamp: Date.now(),
    sortOrder: maxOrder + 1
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['favorites'], 'readwrite');
    const store = transaction.objectStore('favorites');
    const request = store.put(favoriteProduct);

    request.onsuccess = () => resolve(favoriteProduct);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Удалить из избранного
 * @param {string} productId - ID продукта
 * @returns {Promise<void>}
 */
async function removeFromFavorites(productId) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['favorites'], 'readwrite');
    const store = transaction.objectStore('favorites');
    const request = store.delete(productId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Получить все избранное
 * @returns {Promise<Array>} Массив избранных продуктов
 */
async function getAllFavorites() {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['favorites'], 'readonly');
    const store = transaction.objectStore('favorites');
    const request = store.getAll();

    request.onsuccess = () => {
      const favorites = request.result;
      // Сортировка по sortOrder
      favorites.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      resolve(favorites);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Обновить порядок избранного
 * @param {string} productId - ID продукта
 * @param {number} newSortOrder - Новый порядок
 * @returns {Promise<void>}
 */
async function updateFavoriteOrder(productId, newSortOrder) {
  if (!db) await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['favorites'], 'readwrite');
    const store = transaction.objectStore('favorites');
    const getRequest = store.get(productId);

    getRequest.onsuccess = () => {
      const product = getRequest.result;
      if (!product) {
        reject(new Error('Product not found'));
        return;
      }

      product.sortOrder = newSortOrder;
      const putRequest = store.put(product);

      putRequest.onsuccess = () => resolve();
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Переместить в самый верх
 * @param {string} productId - ID продукта
 * @returns {Promise<void>}
 */
async function moveFavoriteToTop(productId) {
  const favorites = await getAllFavorites();

  // Устанавливаем sortOrder = 0
  await updateFavoriteOrder(productId, 0);

  // Увеличиваем sortOrder у всех остальных
  for (const fav of favorites) {
    if (fav.id !== productId) {
      await updateFavoriteOrder(fav.id, fav.sortOrder + 1);
    }
  }
}

/**
 * Переместить в самый низ
 * @param {string} productId - ID продукта
 * @returns {Promise<void>}
 */
async function moveFavoriteToBottom(productId) {
  const favorites = await getAllFavorites();
  const maxOrder = Math.max(...favorites.map(f => f.sortOrder || 0));

  await updateFavoriteOrder(productId, maxOrder + 1);
}

/**
 * Поменять два избранных местами
 * @param {string} id1 - ID первого продукта
 * @param {string} id2 - ID второго продукта
 * @returns {Promise<void>}
 */
async function swapFavorites(id1, id2) {
  const favorites = await getAllFavorites();
  const product1 = favorites.find(f => f.id === id1);
  const product2 = favorites.find(f => f.id === id2);

  if (!product1 || !product2) {
    throw new Error('Products not found');
  }

  const tempOrder = product1.sortOrder;
  await updateFavoriteOrder(id1, product2.sortOrder);
  await updateFavoriteOrder(id2, tempOrder);
}

/**
 * Проверить, есть ли продукт в избранном
 * @param {string} name - Название продукта
 * @param {number} amount - Количество (опционально)
 * @returns {Promise<object>} { exact: boolean, different: boolean }
 */
async function checkInFavorites(name, amount = null) {
  const favorites = await getAllFavorites();

  const exactMatch = favorites.find(f =>
    f.name === name && (amount === null || f.amount === amount)
  );

  const differentAmount = favorites.find(f =>
    f.name === name && amount !== null && f.amount !== amount
  );

  return {
    exact: !!exactMatch,
    different: !!differentAmount
  };
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initDB,
    getDayData,
    addProductToDay,
    updateProductInDay,
    deleteProductFromDay,
    updateWaterIntake,
    getGoalForDate,
    getCurrentGoal,
    updateGoal,
    getAllGoals,
    addToFavorites,
    removeFromFavorites,
    getAllFavorites,
    updateFavoriteOrder,
    moveFavoriteToTop,
    moveFavoriteToBottom,
    swapFavorites,
    checkInFavorites
  };
}
