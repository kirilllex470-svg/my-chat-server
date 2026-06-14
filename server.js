const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.text({ type: '*/*' }));

// База данных прямо в памяти сервера — работает без сбоев
const db = {
    users: {},
    contacts: {},
    messages: {}
};

function getCleanData(body) {
    if (!body) return {};
    if (typeof body === 'string') {
        try { return JSON.parse(body); } catch(e) { return {}; }
    }
    return body;
}

// 1. Сохранение (PUT)
app.put('/:folder/:file.json', (req, res) => {
    const { folder, file } = req.params;
    if (!db[folder]) db[folder] = {};
    db[folder][file] = getCleanData(req.body);
    res.json({ status: "success" });
});

app.put('/:folder/:subfolder/:file.json', (req, res) => {
    const { folder, subfolder, file } = req.params;
    if (!db[folder]) db[folder] = {};
    if (!db[folder][subfolder]) db[folder][subfolder] = {};
    db[folder][subfolder][file] = getCleanData(req.body);
    res.json({ status: "success" });
});

// 2. Чтение (GET)
app.get('/:folder.json', (req, res) => {
    const { folder } = req.params;
    res.json(db[folder] && Object.keys(db[folder]).length ? db[folder] : null);
});

app.get('/:folder/:file.json', (req, res) => {
    const { folder, file } = req.params;
    if (db[folder] && db[folder][file]) {
        return res.json(db[folder][file]);
    }
    res.json(null);
});

app.get('/:folder/:subfolder.json', (req, res) => {
    const { folder, subfolder } = req.params;
    if (db[folder] && db[folder][subfolder]) {
        return res.json(db[folder][subfolder]);
    }
    res.json(null);
});

// 3. Удаление (DELETE)
app.delete('/:folder/:subfolder/:file.json', (req, res) => {
    const { folder, subfolder, file } = req.params;
    if (db[folder] && db[folder][subfolder] && db[folder][subfolder][file]) {
        delete db[folder][subfolder][file];
    }
    res.json({ status: "deleted" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
