const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

// Все маршруты /api/users — только для администратора
router.use(authMiddleware, roleMiddleware(["admin"]));

// GET /api/users — список всех пользователей
router.get("/", async (req, res) => {
  try {
    const users = await req.db("users").select(
      "id", "firstName", "lastName", "email", "role", "isBlocked", "createdAt"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Ошибка получения пользователей" });
  }
});

// GET /api/users/:id — получить пользователя по id
router.get("/:id", async (req, res) => {
  try {
    const user = await req.db("users")
      .select("id", "firstName", "lastName", "email", "role", "isBlocked", "createdAt")
      .where({ id: req.params.id })
      .first();

    if (!user) return res.status(404).json({ error: "Пользователь не найден" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Ошибка получения пользователя" });
  }
});

// PUT /api/users/:id — обновить информацию пользователя
router.put("/:id", async (req, res) => {
  const { firstName, lastName, email, role } = req.body;
  try {
    const [updated] = await req.db("users")
      .where({ id: req.params.id })
      .update({ firstName, lastName, email, role })
      .returning(["id", "firstName", "lastName", "email", "role", "isBlocked"]);

    if (!updated) return res.status(404).json({ error: "Пользователь не найден" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Ошибка обновления пользователя" });
  }
});

// DELETE /api/users/:id — заблокировать пользователя (мягкое удаление)
router.delete("/:id", async (req, res) => {
  try {
    // Нельзя заблокировать самого себя
    if (String(req.params.id) === String(req.user.sub)) {
      return res.status(400).json({ error: "Нельзя заблокировать самого себя" });
    }

    const [blocked] = await req.db("users")
      .where({ id: req.params.id })
      .update({ isBlocked: true })
      .returning(["id", "email", "isBlocked"]);

    if (!blocked) return res.status(404).json({ error: "Пользователь не найден" });
    res.json({ message: "Пользователь заблокирован", user: blocked });
  } catch (err) {
    res.status(500).json({ error: "Ошибка блокировки пользователя" });
  }
});

module.exports = router;
