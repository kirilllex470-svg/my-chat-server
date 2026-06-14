const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

// ИСПРАВЛЕНИЕ: Разрешаем принимать файлы большого размера (до 50 Мегабайт)
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ type: '*/*', limit: '50mb' }));

// База данных в памяти
const db = {
    users: {},
    contacts: {},
    messages: {}
};

function getFormattedTime() {
    const d = new Date();
    const offset = 3; 
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const nd = new Date(utc + (3600000 * offset));
    const dateStr = nd.toLocaleDateString('ru-RU');
    const timeStr = nd.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    return `${dateStr} в ${timeStr}`;
}

function getCleanData(body) {
    if (!body) return {};
    if (typeof body === 'string') {
        try { return JSON.parse(body); } catch(e) { return {}; }
    }
    return body;
}

// 1. Сохранение данных (PUT)
app.put('/:folder/:file.json', (req, res) => {
    const { folder, file } = req.params;
    const data = getCleanData(req.body);
    
    if (!db[folder]) db[folder] = {};
    db[folder][file] = data;

    if (folder === 'users') {
        console.log(`\n=== 🆕 РЕГИСТРАЦИЯ [${getFormattedTime()}] ===`);
        console.log(`Пользователь: [ ${file} ]`);
        console.log(`=========================================\n`);
    }
    res.json({ status: "success" });
});

app.put('/:folder/:subfolder/:file.json', (req, res) => {
    const { folder, subfolder, file } = req.params;
    const data = getCleanData(req.body);
    
    if (!db[folder]) db[folder] = {};
    if (!db[folder][subfolder]) db[folder][subfolder] = {};
    db[folder][subfolder][file] = data;

    if (folder === 'contacts') {
        console.log(`\n=== 👥 НОВЫЙ КОНТАКТ [${getFormattedTime()}] ===`);
        console.log(`============================================\n`);
    }

    if (folder === 'messages') {
        console.log(`\n=== 💬 НОВОЕ СООБЩЕНИЕ [${getFormattedTime()}] ===`);
        console.log(`Отправитель: [ ${data.sender} ] | Есть файл: ${data.file ? 'ДА' : 'НЕТ'}`);
        console.log(`==============================================\n`);
    }
    res.json({ status: "success" });
});

// 2. Чтение данных (GET)
app.get('/:folder.json', (req, res) => {
    const { folder } = req.params;
    res.json(db[folder] && Object.keys(db[folder]).length ? db[folder] : null);
});

app.get('/:folder/:file.json', (req, res) => {
    const { folder, file } = req.params;
    if (db[folder] && db[folder][file]) return res.json(db[folder][file]);
    res.json(null);
});

app.get('/:folder/:subfolder.json', (req, res) => {
    const { folder, subfolder } = req.params;
    if (db[folder] && db[folder][subfolder]) return res.json(db[folder][subfolder]);
    res.json(null);
});

// 3. Удаление данных (DELETE)
app.delete('/:folder/:subfolder/:file.json', (req, res) => {
    const { folder, subfolder, file } = req.params;
    if (db[folder] && db[folder][subfolder] && db[folder][subfolder][file]) {
        delete db[folder][subfolder][file];
    }
    res.json({ status: "deleted" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
