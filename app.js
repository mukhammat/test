const axios = require('axios');
const writeToSheet = require('./googleSheets');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://94.103.91.4:5000';

const REGIST_URL = `${BASE_URL}/auth/registration`;
const LOGIN_URL = `${BASE_URL}/auth/login`;
const CLIENTS_URL = `${BASE_URL}/clients`;
const STATUSES_URL = `${BASE_URL}/clients`;

// Debug mode
const IS_DEBUG = false;

function debug(data) {
    if (IS_DEBUG) {
        console.log(data);
    }
}

// Метод для логина
async function login(username, authUrl) {
    try {
        const loginResponse = await axios.post(authUrl, { "username": username });
        debug(loginResponse.data);
        return loginResponse?.data?.token || null;
    } catch (error) {
        console.error('Ошибка авторизации:', error.message);
        return null;
    }
}

// Метод для регистрации
async function registration(username, registerUrl) {
    try {
        const registerResponse = await axios.post(registerUrl, { "username": username });
        debug(registerResponse.data);
        return registerResponse?.data?.token || null;
    } catch (error) {
        console.error('Ошибка регистрации:', error.message);
        return null;
    }
}


async function getToken(username, authUrl, registerUrl) {
    try {
        // Попытка логина
        const token = await login(username, authUrl);
        if (token) {
            console.log('Токен получен через логин');
            return token;
        }

        console.log('Ошибка при логине. Пробуем регистрацию...');
        const registrationToken = await registration(username, registerUrl);
        if (registrationToken) {
            console.log('Пользователь зарегистрирован, токен получен');
            return registrationToken;
        }

        console.error('Ошибка регистрации: не удалось получить токен');
        return null;
    } catch (error) {
        console.error('Ошибка при получении токена:', error.message);
        return null;
    }
}

async function getClients(token, url) {
    let clients = [];
    let offset = 0;
    const limit = 1000;

    try {
        while (true) {
            const response = await axios.get(`${url}?limit=${limit}&offset=${offset}`, {
                headers: {
                    Authorization: `${token}`
                }
            });
            const data = response.data;

            if (data.length === 0) break;

            clients = clients.concat(data);
            offset += limit;
        }

        debug(clients);
        console.log('Данные клиентов получены...');
        return clients;
    } catch (error) {
        console.error('Ошибка получения данных:', error.message);
        return [];
    }
}

async function getStatuses(clients, token, url) {
    const statuses = [];
    const chunkSize = 1000;

    try {
        for (let i = 0; i < clients.length; i += chunkSize) {
            const chunk = clients.slice(i, i + chunkSize);
            const response = await axios.post(url, {
                "userIds": chunk.map(client => client.id)
            }, {
                headers: { Authorization: `${token}` }
            });

            statuses.push(...response.data);
        }

        debug(statuses);
        console.log('Статусы получены...');
        return statuses;
    } catch (error) {
        console.error('Ошибка получения статусов:', error.message);
        return [];
    }
}

async function getClientsWithStatuses(username) {
    try {
        const token = await getToken(username, LOGIN_URL, REGIST_URL);
        if (!token) return;

        const clients = await getClients(token, CLIENTS_URL);
        const statuses = await getStatuses(clients, token, STATUSES_URL);

        const statusesMap = statuses.reduce((map, status) => {
            map[status.id] = status;
            return map;
        }, {});

        const result = clients.map(client => {
            const status = statusesMap[client.id] || { status: 'Статус не задан' };
            return {
                ...client,
                status: status.status,
            }
        });
        debug(result);
        console.log('Данные клиентов с статусами получены...');
        return result;
    } catch (error) {
        console.error('Ошибка выполнения основного процесса:', error.message);
    }
}

(async function main() {
    try {
        const data = await getClientsWithStatuses("dosnet00@gmail.com");
        if (data && data.length > 0) {
            await writeToSheet(data);
        } else {
            console.log('Нет данных для записи');
        }
    } catch (error) {
        console.error('Ошибка выполнения основного процесса:', error.message);
    }
})();
