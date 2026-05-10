/* =====================================================================
 * scripts/generate-vapid.js — генератор VAPID-ключей для Web Push.
 * Практическое занятие №16.
 * =====================================================================
 *
 * Что такое VAPID (Voluntary Application Server Identification):
 *   Стандарт RFC 8292: пара EC-ключей P-256, которая идентифицирует
 *   ваш сервер в момент отправки push-уведомлений. Без VAPID
 *   современные push-сервисы (FCM/Mozilla AutoPush) откажутся
 *   принимать ваши запросы.
 *
 *   Идея простая: при подписке на push клиент передаёт ваш ПУБЛИЧНЫЙ
 *   ключ. При отправке push сервер подписывает запрос ПРИВАТНЫМ ключом.
 *   Push-сервис проверяет подпись по публичному ключу — если совпало,
 *   значит push идёт от того же сервера, что зарегистрировал подписку.
 *
 *   Пара ключей генерируется ОДИН РАЗ для приложения. Менять их
 *   не нужно (если поменяете — придётся переподписывать всех клиентов).
 *
 * Как пользоваться:
 *   npm run vapid          # запишет ключи в .env (или .env.new если он уже есть)
 *
 * После этого `npm start` подхватит ключи из .env через dotenv.
 * ===================================================================== */

const fs = require('fs');
const path = require('path');
const webpush = require('web-push');

// Генерируем новую пару (под капотом — crypto.generateKeyPairSync('ec', P-256)).
// publicKey/privateKey возвращаются в формате URL-safe base64 (без padding) —
// именно такой формат ожидают браузеры и наш клиентский urlBase64ToUint8Array.
const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log('Сгенерирована пара VAPID-ключей:');
console.log('  Public  Key:', publicKey);
console.log('  Private Key:', privateKey);

// Куда записать. Если .env уже есть — пишем в .env.new, чтобы не сломать
// существующие подписки (для них ключ не меняется, иначе подписки умрут).
const ENV_PATH      = path.join(__dirname, '..', '.env');
const SAFE_ENV_PATH = path.join(__dirname, '..', '.env.new');
const targetPath = fs.existsSync(ENV_PATH) ? SAFE_ENV_PATH : ENV_PATH;

const contents = [
    '# Сгенерировано scripts/generate-vapid.js',
    `# Дата: ${new Date().toISOString()}`,
    '',
    'PORT=3001',
    `VAPID_PUBLIC_KEY=${publicKey}`,
    `VAPID_PRIVATE_KEY=${privateKey}`,
    'VAPID_SUBJECT=mailto:dev@notes-app.local',
    '',
].join('\n');

fs.writeFileSync(targetPath, contents, 'utf8');

console.log('');
console.log(`Сохранено в: ${targetPath}`);
if (targetPath === SAFE_ENV_PATH) {
    console.log('У вас уже есть .env — новые ключи положены рядом, в .env.new.');
    console.log('Если хотите заменить — скопируйте вручную (это сбросит подписки).');
}
