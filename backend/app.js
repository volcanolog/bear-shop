const express = require("express");
const { nanoid } = require("nanoid");
const cors = require("cors");

// Подключаем Swagger
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = 3000;

const path = require("path"); 

app.use(express.json());

app.use("/pictures", express.static(path.join(__dirname, "../pictures")));

app.use((req, res, next) => {
  res.on("finish", () => {
    console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
    if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
      console.log("Body:", req.body);
    }
  });
  next();
});

app.use(cors({
  origin: "http://localhost:3001",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

let products = [
  { id: nanoid(6), name: "Тедди Классик",     category: "Классические", description: "Мягкий плюшевый медведь в классическом стиле с бархатными ушками.",        price: 1290, stock: 25, rating: 4.8, picture:"teddy-classic.png"},
  { id: nanoid(6), name: "Панда Чи-Чи",       category: "Панды",        description: "Очаровательная панда с чёрно-белым окрасом и большими блестящими глазами.", price: 1590, stock: 18, rating: 4.9, picture:"panda-chi-chi.png"},
  { id: nanoid(6), name: "Мишка Снежок",      category: "Зимние",       description: "Белоснежный медведь в вязаном шарфике. Создаёт уют в любое время года.",    price: 1890, stock: 12, rating: 4.7, picture:"snezok.png"},
  { id: nanoid(6), name: "Медведь-Космонавт", category: "Тематические", description: "Плюшевый медведь в скафандре. Мечтает покорить космос вместе с вами.",      price: 2490, stock:  8, rating: 5.0, picture:"cosmo-bear.png"},
  { id: nanoid(6), name: "Бурый Гриша",       category: "Классические", description: "Большой уютный медведь бурого цвета с мягким животиком. Любит объятия.",    price: 2190, stock: 15, rating: 4.6, picture:"grisha.png"},
  { id: nanoid(6), name: "Радужный Тедди",    category: "Праздничные",  description: "Яркий медведь с радужной расцветкой. Поднимает настроение!",                 price: 1750, stock: 20, rating: 4.5, picture:"rainbow.png"},
  { id: nanoid(6), name: "Медведица Розочка", category: "Праздничные",  description: "Нежная розовая медведица с бантиком и сердечком в лапках.",                  price: 1650, stock: 22, rating: 4.8, picture:"rose.png"},
  { id: nanoid(6), name: "Полярный Ледик",    category: "Зимние",       description: "Белоснежный полярный медведь с голубыми глазами.",                           price: 2090, stock: 10, rating: 4.7, picture:"polar-ledic.png"},
  { id: nanoid(6), name: "Мини-Тедди",        category: "Маленькие",    description: "Крохотный медведик размером с ладонь. Всегда рядом!",                        price:  590, stock: 50, rating: 4.4, picture:"mini-teddy.png"},
  { id: nanoid(6), name: "Мишка-Повар",       category: "Тематические", description: "Плюшевый медведь в поварском колпаке и фартуке.",                            price: 2350, stock:  9, rating: 4.9, picture:"cook-bear.png"},
  { id: nanoid(6), name: "Великан Боб",       category: "Большие",      description: "Огромный медведь высотой 80 см. Лучший друг для зимних вечеров.",            price: 9990, stock:  5, rating: 4.9, picture:"grant-bob.png"},
  { id: nanoid(6), name: "Эко-Медведь Лесик", category: "Классические", description: "Из 100% переработанных материалов. Заботится о природе.",                   price: 1990, stock: 30, rating: 4.6, picture:"eco-bear.png"},
];

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API магазина плюшевых медведей",
      version: "1.0.0",
      description: "Простое API для управления товарами интернет-магазина плюшевых медведей",
    },
    servers: [
      { url: `http://localhost:${port}`, description: "Локальный сервер" },
    ],
  },
  apis: ["./app.js"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - category
 *         - description
 *         - price
 *         - stock
 *         - picture
 *       properties:
 *         id:
 *           type: string
 *           description: Автоматически сгенерированный уникальный ID товара
 *         name:
 *           type: string
 *           description: Название товара
 *         category:
 *           type: string
 *           description: Категория товара
 *         description:
 *           type: string
 *           description: Описание товара
 *         price:
 *           type: number
 *           description: Цена товара в рублях
 *         stock:
 *           type: integer
 *           description: Количество на складе
 *         rating:
 *           type: number
 *           description: Рейтинг товара от 0 до 5
 *         picture:
 *           type: string
 *           description: URL-адрес изображения товара
 *          
 *       example:
 *         id: "abc123"
 *         name: "Тедди Классик"
 *         category: "Классические"
 *         description: "Мягкий плюшевый медведь"
 *         price: 1290
 *         stock: 25
 *         rating: 4.8
 *         piccture: "teddy-classic.jpg"
 */

function findProductOr404(id, res) {
  const product = products.find((p) => p.id === id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return null;
  }
  return product;
}

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создаёт новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - category
 *               - description
 *               - price
 *               - stock
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *               picture:
 *                 type: string
 *           
 *     responses:
 *       201:
 *         description: Товар успешно создан
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Ошибка в теле запроса
 */
app.post("/api/products", (req, res) => {
  const { name, category, description, price, stock, rating, picture} = req.body;
  if (!name || !category || !description || price === undefined || stock === undefined) {
    return res.status(400).json({ error: "name, category, description, price and stock are required" });
  }
  const newProduct = {
    id: nanoid(6),
    name: name.trim(),
    category: category.trim(),
    description: description.trim(),
    price: Number(price),
    stock: Number(stock),
    rating: rating ? Number(rating) : 0,
    picture: picture || "default.jpg"
  };
  products.push(newProduct);
  res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Возвращает список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get("/api/products", (req, res) => {
  res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Получает товар по ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get("/api/products/:id", (req, res) => {
  const product = findProductOr404(req.params.id, res);
  if (!product) return;
  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновляет данные товара
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *               picture:
 *                 type: string
 *     responses:
 *       200:
 *         description: Обновлённый товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Нет данных для обновления
 *       404:
 *         description: Товар не найден
 */
app.patch("/api/products/:id", (req, res) => {
  const id = req.params.id;
  const product = findProductOr404(id, res);
  if (!product) return;
  if (req.body.picture !== undefined) product.picture = req.body.picture.trim();
  if (
    req.body?.name === undefined &&
    req.body?.category === undefined &&
    req.body?.description === undefined &&
    req.body?.price === undefined &&
    req.body?.stock === undefined &&
    req.body?.rating === undefined
  ) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  const { name, category, description, price, stock, rating } = req.body;
  if (name !== undefined)        product.name = name.trim();
  if (category !== undefined)    product.category = category.trim();
  if (description !== undefined) product.description = description.trim();
  if (price !== undefined)       product.price = Number(price);
  if (stock !== undefined)       product.stock = Number(stock);
  if (rating !== undefined)      product.rating = Number(rating);

  res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удаляет товар
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар успешно удалён (нет тела ответа)
 *       404:
 *         description: Товар не найден
 */
app.delete("/api/products/:id", (req, res) => {
  const id = req.params.id;
  const exists = products.some((p) => p.id === id);
  if (!exists) return res.status(404).json({ error: "Product not found" });

  products = products.filter((p) => p.id !== id);

  // Правильнее 204 без тела
  res.status(204).send();
});

// 404 для всех остальных маршрутов
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Глобальный обработчик ошибок (чтобы сервер не падал)
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`Сервер запущен на http://localhost:${port}`);
  console.log(`Swagger UI: http://localhost:${port}/api-docs`);
});