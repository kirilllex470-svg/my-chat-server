const webPush = require('web-push');

// Вставь сюда ключи, которые ты только что сгенерировал в терминале:
const publicVapidKey = 'BCJbTksddvu1s4c_1-qMhPxHfn93Ih4oRgi6Fq5V-b0zw7b6mT0v1gFaq20H1LislUuHgzSc81FADMgX0fc12Is';
const privateVapidKey = 'Q5jIcP_I35klwbvTw5w0ZRHlnb7Y9PPYfjWINMauRVI';

webPush.setVapidDetails(
  'mailto:your-email@example.com', // Твой любой email для контактов поддержки Google/Apple
  publicVapidKey,
  privateVapidKey
);

// Сюда мы будем сохранять подписки устройств (в реальном проекте лучше писать это в Firebase СУБД)
// Структура: { "логин_пользователя": subscription_object }
let userPushSubscriptions = {};

// 1. Создаем эндпоинт, на который клиент будет присылать свой токен при входе
app.post('/api/save-subscription', (req, res) => {
  const { login, subscription } = req.body;
  if (!login || !subscription) return res.status(400).json({ error: 'Missing data' });
  
  userPushSubscriptions[login] = subscription;
  res.status(201).json({ success: true });
});

// 2. Универсальная функция отправки пуша, которую ты вызовешь при отправке сообщения
function sendBackgroundPush(targetLogin, senderName, textMessage) {
  const subscription = userPushSubscriptions[targetLogin];
  
  // Если пользователь никогда не заходил с телефона и нет подписки, просто выходим
  if (!subscription) return;

  const payload = JSON.stringify({
    title: `💬 Новое от @${senderName}`,
    body: textMessage || "Отправил вам медиафайл... 📎"
  });

  webPush.sendNotification(subscription, payload)
    .catch(err => {
      console.error("Ошибка отправки пуша в шторку:", err);
      // Если подписка протухла (пользователь удалил приложение), чистим её
      if (err.statusCode === 410 || err.statusCode === 404) {
        delete userPushSubscriptions[targetLogin];
      }
    });
}

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Разрешаем принимать большие файлы и картинки в чате до 50 Мегабайт
app.use(express.json({ limit: '50mb' }));
app.use(express.text({ type: '*/*', limit: '50mb' }));

// База данных в оперативной памяти сервера
const db = {
    users: {},
    contacts: {},
    messages: {}
};

// Функция для красивого вывода времени в логи Render
function getFormattedTime() {
    const d = new Date();
    const offset = 3; // Сдвиг на Московское время (+3)
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
        console.log(`Пользователь [ ${subfolder} ] добавил [ ${file} ]`);
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
    }
    res.json({ status: "deleted" });
});

// ИСПРАВЛЕНИЕ НА 100%: Добавляем жесткие заголовки безопасности для браузеров
app.get('/OneSignalSDKWorker.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Service-Worker-Allowed', '/'); // Разрешаем работу во всем корне сайта
    res.sendFile(path.join(__dirname, 'OneSignalSDKWorker.js'));
});

// Заставляем сервер открывать наш файл index.html как главный сайт
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Сервер запущен на порту ${PORT}`));
