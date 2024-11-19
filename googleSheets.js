const { google } = require('googleapis');
const fs = require('fs').promises;
require('dotenv').config();

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || "1kVDXH5sxhf2peyPbpEy8MOWVnZrjh8Dsp0awiF6cFtw";
const SHEET_NAME = process.env.SHEET_NAME || 'Лист1';

// Авторизация в Google Sheets API
async function authorizeGoogleSheets() {
    const credentials = JSON.parse(await fs.readFile('credentials.json', 'utf8'));
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    return google.sheets({ version: 'v4', auth });
}

// Запись данных в Google-таблицу
async function writeToSheet(data) {
    try {
        const sheetsApi = await authorizeGoogleSheets();

        const values = data.map(client => [
            client.id,
            client.firstName,
            client.lastName,
            client.gender,
            client.address,
            client.city,
            client.phone,
            client.email,
            client.status,
        ]);

        // Обновление данных на листе
        await sheetsApi.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A1`,
            valueInputOption: 'RAW',
            requestBody: {
                values: [
                    ['ID', 'FirstName', 'LastName', 'Gender', 'Address' ,'City', 'Phone', 'email', 'Status'],
                    ...values
                ]
            }
        });

        console.log('Данные успешно записаны в таблицу!');
    } catch (error) {
        console.error('Ошибка записи в Google Sheets:', error.message);
    }
}

module.exports = writeToSheet;
