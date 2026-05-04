const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// GET /api/products — список товаров (любой авторизованный: user, seller, admin)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const products = await req.db("products").select("*");
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: "Ошибка получения товаров" });
  }
});

// GET /api/products/:id — товар по id (любой авторизованный)
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const product = await req.db("products").where({ id: req.params.id }).first();
    if (!product) return res.status(404).json({ error: "Товар не найден" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: "Ошибка получения товара" });
  }
});

// POST /api/products — создать товар (продавец и админ)
router.post(
  "/",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  async (req, res) => {
    const { name, description, price, picture } = req.body;
    if (!name || !price) {
      return res.status(400).json({ error: "name и price обязательны" });
    }
    try {
      const [product] = await req.db("products")
        .insert({ name, description, price, picture })
        .returning("*");
      res.status(201).json(product);
    } catch (err) {
      res.status(500).json({ error: "Ошибка создания товара" });
    }
  }
);

// PUT /api/products/:id — обновить товар (продавец и админ)
router.put(
  "/:id",
  authMiddleware,
  roleMiddleware(["seller", "admin"]),
  async (req, res) => {
    const { name, description, price, picture } = req.body;
    try {
      const [product] = await req.db("products")
        .where({ id: req.params.id })
        .update({ name, description, price, picture })
        .returning("*");
      if (!product) return res.status(404).json({ error: "Товар не найден" });
      res.json(product);
    } catch (err) {
      res.status(500).json({ error: "Ошибка обновления товара" });
    }
  }
);

// DELETE /api/products/:id — удалить товар (только админ)
router.delete(
  "/:id",
  authMiddleware,
  roleMiddleware(["admin"]),
  async (req, res) => {
    try {
      const deleted = await req.db("products").where({ id: req.params.id }).delete();
      if (!deleted) return res.status(404).json({ error: "Товар не найден" });
      res.json({ message: "Товар удалён" });
    } catch (err) {
      res.status(500).json({ error: "Ошибка удаления товара" });
    }
  }
);

module.exports = router;
