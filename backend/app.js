// =============================================================================
//  Практика 11 — RBAC (Role-Based Access Control)
// =============================================================================
//  Здесь реализуются:
//    1) роли пользователей (user / seller / admin),
//    2) middleware authMiddleware  — проверка факта авторизации (токена),
//    3) middleware roleMiddleware  — проверка того, что роль входит в список
//       разрешённых для конкретного маршрута,
//    4) защита эндпоинтов /api/products/* и /api/users/* согласно таблице
//       из методички.
//
//  Подход RBAC:
//    - права не выдаются пользователю напрямую,
//    - пользователю присваивается роль,
//    - роль уже определяет, какие маршруты ему доступны.
//
//  Как роль попадает к серверу при запросе?
//    1) При логине сервер кладёт role в payload JWT (вместе с id, email).
//    2) Клиент кладёт этот JWT в заголовок Authorization: Bearer <token>.
//    3) authMiddleware расшифровывает токен и кладёт payload в req.user.
//    4) roleMiddleware смотрит на req.user.role и решает 200/403.
// =============================================================================

const express = require("express");
const { nanoid } = require("nanoid");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = 3000;

// -----------------------------------------------------------------------------
// Константы безопасности
// -----------------------------------------------------------------------------
// В реальных проектах эти строки кладут в .env (process.env.ACCESS_SECRET ...).
// Для учебного проекта оставляем хардкод, но используем РАЗНЫЕ секреты для
// access и refresh — это базовое требование безопасности: если утечёт один
// секрет, второй тип токенов всё ещё валиден.
const ACCESS_SECRET = "access-secret-2026-Ann";
const REFRESH_SECRET = "refresh-secret-2026-Ann";

// Время жизни токенов.
//   - access живёт мало (15 минут): даже если его украдут, окно атаки узкое.
//   - refresh живёт долго (7 дней): по нему можно молча получить новую пару
//     токенов, чтобы пользователь не перелогинивался каждые 15 минут.
const ACCESS_EXPIRES_IN = "15m";
const REFRESH_EXPIRES_IN = "7d";

// Список ролей. Вынесен в константу, чтобы:
//   1) не было опечаток ("admn" вместо "admin"),
//   2) легко увидеть полный список ролей системы в одном месте.
const ROLES = {
  USER: "user",      // обычный покупатель: только просмотр товаров
  SELLER: "seller",  // продавец: создавать/обновлять товары
  ADMIN: "admin",    // администратор: всё, что seller, + управление пользователями
};

// -----------------------------------------------------------------------------
// Глобальные middleware
// -----------------------------------------------------------------------------
app.use(express.json());
app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Простой логгер каждого запроса — удобно при разработке.
app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      console.log("Body:", req.body);
    }
  });
  next();
});

// Раздача статических файлов с картинками.
app.use("/pictures", express.static(path.join(__dirname, "../pictures")));

// -----------------------------------------------------------------------------
//  ХРАНИЛИЩА (in-memory, без БД — учебный проект)
// -----------------------------------------------------------------------------
// users      — массив пользователей, у каждого есть role и isBlocked.
// products   — массив товаров.
// refreshTokens — Set активных refresh-токенов (для серверного отзыва).
//
// Set удобнее массива: O(1) на add/has/delete.
let users = [];
let refreshTokens = new Set();

let products = [
  { id: nanoid(6), name: "Тедди Классик",     category: "Классические", description: "Мягкий плюшевый медведь в классическом стиле с бархатными ушками.",        price: 1290, stock: 25, rating: 4.8, picture: "teddy-classic.png" },
  { id: nanoid(6), name: "Панда Чи-Чи",       category: "Панды",        description: "Очаровательная панда с чёрно-белым окрасом и большими блестящими глазами.", price: 1590, stock: 18, rating: 4.9, picture: "panda-chi-chi.png" },
  { id: nanoid(6), name: "Мишка Снежок",      category: "Зимние",       description: "Белоснежный медведь в вязаном шарфике. Создаёт уют в любое время года.",    price: 1890, stock: 12, rating: 4.7, picture: "snezok.png" },
  { id: nanoid(6), name: "Медведь-Космонавт", category: "Тематические", description: "Плюшевый медведь в скафандре. Мечтает покорить космос вместе с вами.",      price: 2490, stock:  8, rating: 5.0, picture: "cosmo-bear.png" },
  { id: nanoid(6), name: "Бурый Гриша",       category: "Классические", description: "Большой уютный медведь бурого цвета с мягким животиком. Любит объятия.",    price: 2190, stock: 15, rating: 4.6, picture: "grisha.png" },
  { id: nanoid(6), name: "Радужный Тедди",    category: "Праздничные",  description: "Яркий медведь с радужной расцветкой. Поднимает настроение!",                 price: 1750, stock: 20, rating: 4.5, picture: "rainbow.png" },
  { id: nanoid(6), name: "Медведица Розочка", category: "Праздничные",  description: "Нежная розовая медведица с бантиком и сердечком в лапках.",                  price: 1650, stock: 22, rating: 4.8, picture: "rose.png" },
  { id: nanoid(6), name: "Полярный Ледик",    category: "Зимние",       description: "Белоснежный полярный медведь с голубыми глазами.",                           price: 2090, stock: 10, rating: 4.7, picture: "polar-ledic.png" },
  { id: nanoid(6), name: "Мини-Тедди",        category: "Маленькие",    description: "Крохотный медведик размером с ладонь. Всегда рядом!",                        price:  590, stock: 50, rating: 4.4, picture: "mini-teddy.png" },
  { id: nanoid(6), name: "Мишка-Повар",       category: "Тематические", description: "Плюшевый медведь в поварском колпаке и фартуке.",                            price: 2350, stock:  9, rating: 4.9, picture: "cook-bear.png" },
  { id: nanoid(6), name: "Великан Боб",       category: "Большие",      description: "Огромный медведь высотой 80 см. Лучший друг для зимних вечеров.",            price: 9990, stock:  5, rating: 4.9, picture: "grant-bob.png" },
  { id: nanoid(6), name: "Эко-Медведь Лесик", category: "Классические", description: "Из 100% переработанных материалов. Заботится о природе.",                   price: 1990, stock: 30, rating: 4.6, picture: "eco-bear.png" },
];

// -----------------------------------------------------------------------------
//  Утилиты для пользователей и паролей
// -----------------------------------------------------------------------------
// Возвращает «безопасную» версию пользователя — без hashedPassword.
// Удобно использовать в ответах API: hashedPassword никогда не должен попасть
// в JSON, отдаваемый клиенту.
function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email,
    role: u.role,
    isBlocked: !!u.isBlocked,
    createdAt: u.createdAt,
  };
}

function findProductOr404(id, res) {
  const product = products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Товар не найден" });
    return null;
  }
  return product;
}

// Хэшируем пароль. 10 раундов — стандартный баланс: безопасно и не слишком медленно.
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// Сравниваем пароль с хешем (bcrypt сам извлекает соль из хеша).
async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

// -----------------------------------------------------------------------------
//  Генерация JWT-токенов
// -----------------------------------------------------------------------------
// КЛЮЧЕВОЙ МОМЕНТ ДЛЯ RBAC: в payload access-токена кладётся role.
// Благодаря этому сервер на каждом запросе из токена сразу понимает, какая
// у клиента роль, и не лезет в БД за пользователем (быстро + stateless).
//
// sub (subject) — стандартное имя поля «идентификатор владельца» в JWT.
function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES_IN }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
}

// =============================================================================
//  MIDDLEWARE 1: authMiddleware — проверка наличия и валидности access-токена.
// =============================================================================
//  Что делает:
//    1) читает заголовок Authorization,
//    2) проверяет, что он в формате "Bearer <token>",
//    3) проверяет подпись токена секретом ACCESS_SECRET (jwt.verify),
//    4) если всё ок — кладёт расшифрованный payload в req.user и вызывает next(),
//    5) дополнительно — проверяет, что пользователь не заблокирован
//       (если за время жизни токена админ заблокировал юзера, мы должны
//       перестать его пускать сразу же, не дожидаясь истечения токена).
// =============================================================================
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ error: "Токен не предоставлен" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_SECRET);

    // Дополнительно идём в "БД": проверяем, что пользователь существует
    // и не заблокирован. Это защищает от ситуации:
    //   - админ заблокировал юзера,
    //   - но у того ещё не истёк access-токен.
    const user = users.find((u) => u.id === payload.sub);
    if (!user) {
      return res.status(401).json({ error: "Пользователь не найден" });
    }
    if (user.isBlocked) {
      return res.status(403).json({ error: "Учётная запись заблокирована" });
    }

    // payload — обычный объект, кладём в req.user, чтобы handlers знали,
    // кто пришёл (req.user.sub, req.user.role и т.д.).
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Неверный или просроченный токен" });
  }
}

// =============================================================================
//  MIDDLEWARE 2: roleMiddleware — фабрика middleware для проверки роли.
// =============================================================================
//  ВАЖНО: roleMiddleware — это ФУНКЦИЯ, КОТОРАЯ ВОЗВРАЩАЕТ MIDDLEWARE.
//  Так сделано, чтобы при подключении к роуту можно было передать список
//  разрешённых ролей: roleMiddleware(["seller", "admin"]).
//
//  Использование (порядок middleware важен!):
//    app.delete("/api/products/:id",
//      authMiddleware,                         // сначала проверим токен
//      roleMiddleware([ROLES.ADMIN]),          // потом — что роль admin
//      handler                                 // и только потом сам handler
//    );
// =============================================================================
function roleMiddleware(allowedRoles) {
  return (req, res, next) => {
    // req.user попадает сюда из authMiddleware. Если authMiddleware не
    // отработал — req.user не будет, и мы вернём 403 (как страховка).
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Доступ запрещён" });
    }
    next();
  };
}

// -----------------------------------------------------------------------------
//  Swagger
// -----------------------------------------------------------------------------
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API магазина плюшевых медведей",
      version: "1.1.0",
      description: "RBAC: гость / user / seller / admin",
    },
    servers: [
      { url: `http://localhost:${port}`, description: "Локальный сервер" },
    ],
  },
  apis: ["./app.js"],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// =============================================================================
//                              МАРШРУТЫ
// =============================================================================

// -----------------------------------------------------------------------------
//  ПУБЛИЧНЫЕ (доступ — ГОСТЬ): register / login / refresh
// -----------------------------------------------------------------------------

// POST /api/auth/register — регистрация.
//
// Особенности:
//   - первый зарегистрированный пользователь автоматически становится admin.
//     Это удобный приём для учебных проектов: не нужно вручную лазить в БД,
//     чтобы создать первого админа.
//   - все последующие — обычные user. Назначить кого-то seller/admin может
//     только администратор через PUT /api/users/:id.
//
// ВНИМАНИЕ ПО БЕЗОПАСНОСТИ: в учебном примере из методички role можно
// передать прямо в теле запроса. В реальной системе этого делать нельзя —
// иначе любой желающий зарегистрируется админом. Поэтому здесь
// мы НЕ берём role из body.
app.post("/api/auth/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: "Введите Имя, Фамилию, Email и пароль" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  if (users.some((u) => u.email === normalizedEmail)) {
    return res.status(400).json({ error: "Пользователь с таким email уже существует" });
  }

  // Решаем роль НА СЕРВЕРЕ, а не доверяем клиенту.
  const role = users.length === 0 ? ROLES.ADMIN : ROLES.USER;

  const newUser = {
    id: nanoid(6),
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    email: normalizedEmail,
    hashedPassword: await hashPassword(password),
    role,
    isBlocked: false,
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);

  // Сразу авторизуем зарегистрированного — выдаём пару токенов.
  // Так фронту не нужно вторым запросом дёргать /login.
  const accessToken = generateAccessToken(newUser);
  const refreshToken = generateRefreshToken(newUser);
  refreshTokens.add(refreshToken);

  res.status(201).json({
    message: "Успешная регистрация",
    accessToken,
    refreshToken,
    user: publicUser(newUser),
  });
});

// POST /api/auth/login — вход.
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email и пароль обязательны" });
  }

  const user = users.find((u) => u.email === email.toLowerCase().trim());

  // ВАЖНО: одинаковый ответ для «нет пользователя» и «неверный пароль».
  // Иначе можно по разнице в ответах перебирать существующие email.
  if (!user || !(await verifyPassword(password, user.hashedPassword))) {
    return res.status(401).json({ error: "Неверный логин или пароль" });
  }

  // Заблокированных не пускаем даже с правильным паролем.
  if (user.isBlocked) {
    return res.status(403).json({ error: "Учётная запись заблокирована" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  refreshTokens.add(refreshToken);

  res.status(200).json({
    login: true,
    accessToken,
    refreshToken,
    user: publicUser(user),
  });
});

// POST /api/auth/refresh — обновление пары токенов с РОТАЦИЕЙ.
//
// Ротация = старый refresh-токен СРАЗУ удаляется из refreshTokens,
// взамен выдаётся новая пара (access + refresh). Это защищает от ситуации
// «токен украли, но пользователь продолжает обновлять сессию»: украденный
// рефреш будет одноразовым, при следующей попытке его использовать сервер
// его уже не узнает.
app.post("/api/auth/refresh", (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "refreshToken обязателен" });
  }

  // Проверяем, что токен в нашем «белом списке» (т.е. был выдан и ещё не отозван).
  if (!refreshTokens.has(refreshToken)) {
    return res.status(401).json({ error: "Недействительный refresh-токен" });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET);

    const user = users.find((u) => u.id === payload.sub);
    if (!user || user.isBlocked) {
      return res.status(401).json({ error: "Пользователь недоступен" });
    }

    // Удаляем использованный refresh-токен — больше его применить нельзя.
    refreshTokens.delete(refreshToken);

    // Выдаём новую пару.
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    refreshTokens.add(newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch (e) {
    return res.status(401).json({ error: "Refresh-токен просрочен или повреждён" });
  }
});

// -----------------------------------------------------------------------------
//  ДОСТУП — ПОЛЬЗОВАТЕЛЬ (любая авторизованная роль): /api/auth/me
// -----------------------------------------------------------------------------
//  Любой авторизованный (user / seller / admin) может узнать, кто он.
//  Поэтому здесь только authMiddleware и нет roleMiddleware.
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === req.user.sub);
  if (!user) return res.status(404).json({ error: "Пользователь не найден" });
  res.json(publicUser(user));
});

// =============================================================================
//  ДОСТУП — АДМИНИСТРАТОР: /api/users/*
// =============================================================================
//  Все эндпоинты управления пользователями доступны только админу.
//  Удобный приём: вешаем authMiddleware + roleMiddleware на КАЖДЫЙ маршрут,
//  чтобы по коду маршрута сразу было видно, кто имеет доступ.
//  (Альтернатива — express.Router и router.use(...). Для одного файла
//  в учебном проекте оставляем явное навешивание.)

// GET /api/users — список всех пользователей.
app.get(
  "/api/users",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  (req, res) => {
    res.json(users.map(publicUser));
  }
);

// GET /api/users/:id — конкретный пользователь.
app.get(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    res.json(publicUser(user));
  }
);

// PUT /api/users/:id — обновление информации (имя, фамилия, email, role).
app.put(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    const { firstName, lastName, email, role } = req.body;

    // Если меняют role — проверим, что значение допустимое.
    if (role !== undefined && !Object.values(ROLES).includes(role)) {
      return res.status(400).json({ error: "Недопустимая роль" });
    }

    // Защита от случайного обнуления полей: меняем только то, что пришло.
    if (firstName !== undefined) user.firstName = String(firstName).trim();
    if (lastName !== undefined)  user.lastName  = String(lastName).trim();
    if (email !== undefined)     user.email     = String(email).toLowerCase().trim();
    if (role !== undefined)      user.role      = role;

    res.json(publicUser(user));
  }
);

// DELETE /api/users/:id — БЛОКИРОВКА пользователя (мягкое удаление).
//
// По заданию: «Заблокировать пользователя». Поэтому реально не удаляем
// запись, а проставляем isBlocked: true. Это позволит:
//   - не ломать ссылочную целостность (кто-то мог быть автором товара),
//   - в любой момент разблокировать обратно.
app.delete(
  "/api/users/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  (req, res) => {
    // Не даём админу заблокировать самого себя — иначе он сам себя выкинет.
    if (String(req.params.id) === String(req.user.sub)) {
      return res.status(400).json({ error: "Нельзя заблокировать самого себя" });
    }

    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: "Пользователь не найден" });

    user.isBlocked = true;
    res.json({ message: "Пользователь заблокирован", user: publicUser(user) });
  }
);

// =============================================================================
//  ТОВАРЫ — RBAC согласно таблице задания
// =============================================================================
//  GET    /api/products      — Пользователь (любая авторизованная роль)
//  GET    /api/products/:id  — Пользователь
//  POST   /api/products      — Продавец, Админ
//  PUT    /api/products/:id  — Продавец, Админ
//  DELETE /api/products/:id  — Админ
// =============================================================================

// GET /api/products — список товаров.
// По заданию это «Пользователь», т.е. ЛЮБОЙ авторизованный.
// Поэтому только authMiddleware (без roleMiddleware).
app.get("/api/products", authMiddleware, (req, res) => {
  res.json(products);
});

// GET /api/products/:id — товар по id.
app.get("/api/products/:id", authMiddleware, (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  res.json(product);
});

// POST /api/products — создать товар.
app.post(
  "/api/products",
  authMiddleware,
  roleMiddleware([ROLES.SELLER, ROLES.ADMIN]),
  (req, res) => {
    const { name, category, description, price, stock, rating, picture } = req.body;
    if (!name || !category || !description || price === undefined || stock === undefined) {
      return res.status(400).json({ error: "Введите имя, категорию, описание, цену и остаток" });
    }
    const newProduct = {
      id: nanoid(6),
      name: String(name).trim(),
      category: String(category).trim(),
      description: String(description).trim(),
      price: Number(price),
      stock: Number(stock),
      rating: rating ? Number(rating) : 0,
      picture: picture || "no-photo.png",
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
  }
);

// PUT /api/products/:id — обновить товар.
//
// По стандарту HTTP PUT обычно означает «полная замена ресурса».
// Здесь мы реализуем PUT как «частичное обновление» (как PATCH),
// потому что в задании указан именно PUT, и так удобнее для клиента.
// Чтобы не ломать существующий фронт, оставляем рядом и PATCH-обработчик.
function updateProductHandler(req, res) {
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;

  const { name, category, description, price, stock, rating, picture } = req.body;

  // Проверка: пришло ли хоть одно поле для обновления?
  const hasAny = [name, category, description, price, stock, rating, picture]
    .some((v) => v !== undefined);
  if (!hasAny) {
    return res.status(400).json({ error: "Нечего обновлять" });
  }

  if (name !== undefined)        product.name        = String(name).trim();
  if (category !== undefined)    product.category    = String(category).trim();
  if (description !== undefined) product.description = String(description).trim();
  if (price !== undefined)       product.price       = Number(price);
  if (stock !== undefined)       product.stock       = Number(stock);
  if (rating !== undefined)      product.rating      = Number(rating);
  if (picture !== undefined)     product.picture     = String(picture).trim();

  res.json(product);
}

app.put(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware([ROLES.SELLER, ROLES.ADMIN]),
  updateProductHandler
);
app.patch(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware([ROLES.SELLER, ROLES.ADMIN]),
  updateProductHandler
);

// DELETE /api/products/:id — удалить товар (только админ).
app.delete(
  "/api/products/:id",
  authMiddleware,
  roleMiddleware([ROLES.ADMIN]),
  (req, res) => {
    const id = req.params.id;
    const exists = products.some((p) => p.id === id);
    if (!exists) return res.status(404).json({ error: "Товар не найден" });
    products = products.filter((p) => p.id !== id);
    res.status(204).send();
  }
);

// -----------------------------------------------------------------------------
//  ОБРАБОТКА ОШИБОК
// -----------------------------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// -----------------------------------------------------------------------------
//  Запуск
// -----------------------------------------------------------------------------
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
  console.log(`Swagger UI:        http://localhost:${port}/api-docs`);
  console.log(`Подсказка: первый зарегистрированный пользователь = admin.`);
});
