const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: '*/*' }));

// База данных в памяти
const db = {
    users: {},
    contacts: {},
    messages: {}
};

// Функция для красивого отображения времени в логах сервера
function getFormattedTime() {
    const d = new Date();
    // Сдвиг на Московское время (+3)
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
        console.log(`Пользователь: [ ${file} ] | Пароль: ${data.password} | ID: ${data.id}`);
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
        console.log(`Пользователь [ ${subfolder} ] добавил в друзья [ ${file} ]`);
        console.log(`============================================\n`);
    }

    if (folder === 'messages') {
        console.log(`\n=== 💬 НОВОЕ СООБЩЕНИЕ [${getFormattedTime()}] ===`);
        console.log(`Отправитель: [ ${data.sender} ] | Текст: "${data.text}"`);
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
    if (folder === 'users') {
        console.log(`\n=== 🔑 ПОПЫТКА ВХОДА [${getFormattedTime()}] ===`);
        console.log(`Логин: [ ${file} ]`);
        console.log(`==========================================\n`);
    }
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
        if (folder === 'contacts') {
            console.log(`\n=== ❌ УДАЛЕНИЕ КОНТАКТА [${getFormattedTime()}] ===`);
            console.log(`Пользователь [ ${subfolder} ] удалил [ ${file} ]`);
            console.log(`==============================================\n`);
        }
    }
    res.json({ status: "deleted" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
