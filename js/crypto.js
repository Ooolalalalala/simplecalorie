// Шифрование и расшифровка API ключа
// Метод: Base64(XOR(apiKey, password))

/**
 * Шифрует API ключ с паролем
 * @param {string} apiKey - API ключ OpenAI
 * @param {string} password - Пароль пользователя
 * @returns {string} Зашифрованная строка (Base64)
 */
function encryptApiKey(apiKey, password) {
    if (!apiKey || !password) {
        throw new Error('API ключ и пароль обязательны');
    }

    // XOR шифрование
    const xored = xorCipher(apiKey, password);

    // Base64 кодирование
    const encrypted = btoa(xored);

    return encrypted;
}

/**
 * Расшифровывает API ключ с паролем
 * @param {string} encrypted - Зашифрованная строка (Base64)
 * @param {string} password - Пароль пользователя
 * @returns {string} Расшифрованный API ключ
 */
function decryptApiKey(encrypted, password) {
    if (!encrypted || !password) {
        throw new Error('Зашифрованный ключ и пароль обязательны');
    }

    try {
        // Base64 декодирование
        const xored = atob(encrypted);

        // XOR расшифровка (XOR симметричен)
        const decrypted = xorCipher(xored, password);

        return decrypted;
    } catch (error) {
        throw new Error('Ошибка расшифровки: неверный пароль или файл поврежден');
    }
}

/**
 * XOR шифрование/расшифровка (симметричное)
 * @param {string} text - Текст для шифрования
 * @param {string} key - Ключ (пароль)
 * @returns {string} Результат XOR
 */
function xorCipher(text, key) {
    let result = '';

    for (let i = 0; i < text.length; i++) {
        // XOR каждого символа текста с символом ключа (циклически)
        const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
    }

    return result;
}

/**
 * Проверка наличия API ключа
 * @returns {boolean} true если ключ загружен
 */
function hasApiKey() {
    return !!sessionStorage.getItem('apiKey');
}

/**
 * Получение API ключа
 * @returns {string|null} API ключ или null
 */
function getApiKey() {
    return sessionStorage.getItem('apiKey');
}
