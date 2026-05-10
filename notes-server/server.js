/* =====================================================================
 * server.js — сервер для приложения «Заметки».
 * Практическое занятие №16. WebSocket + Web Push.
 * =====================================================================
 *
 * Что делает этот сервер:
 *   1) РАЗДАЁТ статику клиента (папка ../notes-app) — HTML, JS, иконки,
 *      манифест, content/. Открыть приложение можно по http://localhost:3001/.
 *   2) ВЕБ-СОКЕТЫ через Socket.IO:
 *        - принимает событие `newTask` от клиента;
 *        - рассылает `taskAdded` всем подключённым клиентам (методичка);
 *        - инициирует push-рассылку всем подписчикам.
 *   3) PUSH:
 *        - GET  /vapidPublicKey   → отдаёт публичный VAPID-ключ;
 *        - POST /subscribe        → сохраняет подписку браузера;
 *        - POST /unsubscribe      → удаляет подписку;
 *        - при `newTask` рассылает push через web-push.
 *
 * Архитектурные заметки (полезно для экзамена):
 *   - Express создаёт http.Server только под капотом app.listen().
 *     Чтобы прицепить сюда же Socket.IO, мы создаём http.Server вручную
 *     через http.createServer(app), и вызываем listen на нём.
 *   - Подписки храним в памяти (Map по endpoint). После рестарта они
 *     теряются — для production нужна БД (Redis/Postgres). Endpoint
 *     уникален, поэтому Map по нему гарантирует отсутствие дублей.
 *   - VAPID-ключи берутся из .env (через dotenv). Приватный ключ —
 *     СЕКРЕТ, его НЕЛЬЗЯ коммитить (.env в .gitignore).
 * ===================================================================== */

require('dotenv').config(); // подгружает .env в process.env

const path       = require('path');
const http       = require('http');
const express    = require('express');
const cors       = require('cors');
const bodyParser = require('body-parser');
const webpush    = require('web-push');
const { Server: SocketIOServer } = require('socket.io');


/* ---------- 1. Конфигурация (порт, VAPID) ---------- */

const PORT          = Number(process.env.PORT) || 3001;
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT     || 'mailto:dev@notes-app.local';

// Если ключей нет — push работать не будет, но WebSocket-чат продолжит.
// Это удобно для обучения: можно сначала запустить без push,
// а ключи добавить позже через `npm run vapid`.
const PUSH_ENABLED = Boolean(VAPID_PUBLIC && VAPID_PRIVATE);

if (PUSH_ENABLED) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    console.log('[server] VAPID настроен. Push-уведомления включены.');
} else {
    console.warn('[server] VAPID-ключи отсутствуют. Запустите `npm run vapid`.');
    console.warn('[server] WebSocket работает, но push отправляться НЕ будет.');
}


/* ---------- 2. Express: статика + push-эндпоинты ---------- */

const app = express();

// CORS пригождается, если клиент открывают из другого origin
// (например, через npm start самого notes-app на 5173).
// Для локального запуска через сам сервер он необязателен — клиент
// будет на том же origin (3001), но безопасный default — разрешить.
app.use(cors());

// Парсер JSON-тел запросов — методичка передаёт подписку в body как JSON.
// В свежих версиях Express уже встроен express.json(), но методичка
// использует bodyParser — оставляем для совместимости с примером.
app.use(bodyParser.json());

// Раздача клиента: путь относительно server.js.
// __dirname === абсолютный путь к notes-server/, поэтому ../notes-app
// указывает на нашу клиентскую папку.
const STATIC_DIR = path.join(__dirname, '..', 'notes-app');
app.use(express.static(STATIC_DIR));
console.log('[server] Раздаём статику из:', STATIC_DIR);

// Эндпоинт отдачи публичного ключа клиенту.
// Зачем: клиенту НУЖЕН публичный ключ для PushManager.subscribe(),
// и удобнее запросить его у сервера, чем хардкодить на фронте —
// меньше синхронизации при ротации ключей.
app.get('/vapidPublicKey', (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC || null });
});


/* ---------- 3. Хранилище push-подписок ---------- */
//
// Подписка — это объект вида:
//   { endpoint: 'https://fcm.googleapis.com/...', expirationTime: null,
//     keys: { p256dh: '...', auth: '...' } }
//
// endpoint уникален для пары (браузер, ключ VAPID, регистрация).
// Используем Map для O(1) добавления/удаления + защиты от дублей.
const subscriptions = new Map(); // endpoint -> subscription

// POST /subscribe — клиент шлёт сюда свою подписку после
// pushManager.subscribe().
app.post('/subscribe', (req, res) => {
    const sub = req.body;

    // Валидация: эндпоинт обязателен.
    if (!sub || !sub.endpoint) {
        return res.status(400).json({ error: 'subscription.endpoint required' });
    }

    subscriptions.set(sub.endpoint, sub);
    console.log(`[server] +subscription (всего: ${subscriptions.size})`);
    res.status(201).json({ message: 'Подписка сохранена' });
});

// POST /unsubscribe — клиент шлёт endpoint, который нужно забыть.
app.post('/unsubscribe', (req, res) => {
    const { endpoint } = req.body || {};
    if (!endpoint) {
        return res.status(400).json({ error: 'endpoint required' });
    }

    subscriptions.delete(endpoint);
    console.log(`[server] -subscription (всего: ${subscriptions.size})`);
    res.status(200).json({ message: 'Подписка удалена' });
});


/* ---------- 4. Socket.IO: WebSocket-обмен в реальном времени ---------- */

// Создаём http.Server вручную, чтобы прицепить Socket.IO.
// Если бы делали app.listen() — Express создал бы свой http.Server,
// к которому Socket.IO мы бы уже не подключились.
const httpServer = http.createServer(app);

const io = new SocketIOServer(httpServer, {
    // CORS для WebSocket-handshake (HTTP upgrade). Те же причины, что и выше.
    cors: { origin: '*', methods: ['GET', 'POST'] },
});

io.on('connection', (socket) => {
    // socket.id — уникальный ID этого подключения. Полезен для логов.
    console.log('[ws] connect:', socket.id);

    // Главное событие приложения — клиент сообщает, что добавил задачу.
    // Сервер раздаёт её другим клиентам и шлёт push всем подписчикам.
    socket.on('newTask', async (task) => {
        console.log('[ws] newTask from', socket.id, '·', task && task.text);

        // Раздаём ВСЕМ клиентам, включая отправителя (как в методичке).
        // socket.broadcast.emit('taskAdded', ...) дал бы всем КРОМЕ отправителя.
        io.emit('taskAdded', task);

        // Если push настроен — рассылаем уведомление всем подписчикам.
        if (PUSH_ENABLED && subscriptions.size > 0) {
            await sendPushToAll({
                title: 'Новая задача',
                body:  task && task.text ? String(task.text) : 'Без текста',
            });
        }
    });

    socket.on('disconnect', (reason) => {
        console.log('[ws] disconnect:', socket.id, '·', reason);
    });
});


/* ---------- 5. Рассылка push всем подписчикам ---------- */
//
// payload — это произвольная JSON-строка, её получит обработчик 'push'
// в Service Worker'е клиента (через event.data.json()).
//
// web-push под капотом:
//   1. Шифрует payload по схеме aes128gcm с ECDH (секрет из VAPID + auth + p256dh).
//   2. Подписывает запрос приватным VAPID-ключом (JWT в заголовке Authorization).
//   3. Шлёт POST на endpoint браузерного push-сервиса (FCM/Mozilla/Apple).
//   4. Push-сервис передаёт уведомление браузеру; браузер будит SW и шлёт ему 'push'.
//
// Что делать с ошибками:
//   - 404/410 от push-сервиса = подписка протухла (браузер удалил её
//     или пользователь отключил уведомления). Удаляем у себя тоже,
//     чтобы не отправлять туда снова.
//   - Прочие ошибки (напр., 5xx) логируем, но подписку не трогаем —
//     возможно, проблема временная.

async function sendPushToAll(payloadObj) {
    const payload = JSON.stringify(payloadObj);
    const dead = []; // эндпоинты протухших подписок

    // Параллельная отправка через Promise.all — быстрее, чем последовательная.
    await Promise.all(
        Array.from(subscriptions.entries()).map(async ([endpoint, sub]) => {
            try {
                await webpush.sendNotification(sub, payload);
            } catch (err) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    dead.push(endpoint); // протухло
                } else {
                    console.error('[push] error', err.statusCode, err.body || err.message);
                }
            }
        })
    );

    if (dead.length) {
        dead.forEach((e) => subscriptions.delete(e));
        console.log(`[push] удалено протухших подписок: ${dead.length}`);
    }
    console.log(`[push] отправлено уведомлений: ${subscriptions.size}`);
}


/* ---------- 6. Запуск ---------- */

httpServer.listen(PORT, () => {
    console.log(`[server] Слушаем http://localhost:${PORT}`);
    console.log('[server] Откройте в браузере: http://localhost:' + PORT + '/');
});
