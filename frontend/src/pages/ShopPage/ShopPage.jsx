import React, { useEffect, useState } from "react";
import "./ShopPage.css";

import ProductsList from "../../components/ProductsList/ProductsList";
import ProductModal from "../../components/ProductModal/ProductModal";
import { api } from "../../api";

// =============================================================================
//  Главная страница магазина.
// =============================================================================
//  Что важно для практики 11 (RBAC) — на этой странице мы показываем разный
//  набор кнопок в зависимости от роли пользователя:
//
//    - гость        : видит каталог в режиме «только просмотр»
//                     (после авторизации сервер потребует token, см. /api/products),
//                     но в этом проекте сервер требует авторизацию даже для GET,
//                     поэтому гость увидит «Ошибка загрузки товаров» — это норма
//                     по таблице задания.
//    - user         : видит каталог;
//    - seller       : + видит «Создать», «Редактировать»;
//    - admin        : + видит «Удалить», + кнопку «Пользователи»
//                     (управление пользователями).
//
//  Отрисовка кнопок — это «удобство», а не безопасность.
//  Реальный контроль доступа делает сервер: даже если кто-то откроет devtools
//  и вручную вызовет api.deleteProduct(...), сервер вернёт 403.
// =============================================================================
export default function ShopPage({ onNavigate, user, onLogout, onOpenUsers }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingProduct, setEditingProduct] = useState(null);

  // ── Вычисляемые "права" пользователя на этой странице ─────────────────────
  // Удобный паттерн: мы один раз считаем флаги, и ниже в JSX просто пишем
  // {canCreate && <button>...}, не повторяя сравнение role в десяти местах.
  const role = user?.role;
  const canCreate = role === "seller" || role === "admin";
  const canEdit   = role === "seller" || role === "admin";
  const canDelete = role === "admin";
  const isAdmin   = role === "admin";

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error(err);
      // 401 — это нормально для неавторизованного пользователя.
      // Interceptor попробует обновить токен. Если откатилось до 401 — значит
      // пользователь не авторизован, и мы просто оставляем пустой список.
      if (err.response?.status !== 401) {
        alert("Ошибка загрузки товаров");
      }
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setModalMode("edit");
    setEditingProduct(product);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить товар?")) return;
    try {
      await api.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error(err);
      alert("Ошибка: " + (err.response?.data?.error || "Не удалось удалить товар"));
    }
  };

  const handleSubmitModal = async (payload) => {
    try {
      if (modalMode === "create") {
        const newProduct = await api.createProduct(payload);
        setProducts((prev) => [...prev, newProduct]);
      } else {
        const updatedProduct = await api.updateProduct(payload.id, payload);
        setProducts((prev) =>
          prev.map((p) => (p.id === payload.id ? updatedProduct : p))
        );
      }
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Ошибка сохранения: " + (err.response?.data?.error || "Проверьте авторизацию"));
    }
  };

  // Метка роли для шапки — чтобы пользователь видел, под кем он зашёл.
  const roleLabel = {
    user: "Пользователь",
    seller: "Продавец",
    admin: "Администратор",
  }[role];

  return (
    <div className="page">
      <header className="header">
        <div className="header__inner">
          <div className="brand">Медвежья лавка</div>
          <div className="header__right">
            {user ? (
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <span style={{ color: "#818cf8" }}>
                  Привет, {user.firstName || user.FirstName}!
                  {roleLabel && (
                    <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
                      ({roleLabel})
                    </span>
                  )}
                </span>

                {/* Кнопка "Пользователи" — только админу */}
                {isAdmin && onOpenUsers && (
                  <button className="btn" onClick={onOpenUsers}>Пользователи</button>
                )}

                <button className="btn" onClick={onLogout}>Выйти</button>
              </div>
            ) : (
              <button className="btn" onClick={onNavigate}>Вход / Регистрация</button>
            )}
          </div>
        </div>
      </header>

      <main className="main">
        <div className="container">
          <div className="toolbar">
            <h1 className="title">Товары</h1>
            {/* Создавать может seller и admin */}
            {canCreate && (
              <button className="btn btn--primary" onClick={openCreate}>
                + Создать
              </button>
            )}
          </div>

          {loading ? (
            <div className="empty">Загрузка...</div>
          ) : (
            <ProductsList
              products={products}
              // Передаём в карточку только те колбэки, которые разрешены роли.
              // ProductItem сам решит, какие кнопки рисовать (по наличию пропа).
              onEdit={canEdit ? openEdit : null}
              onDelete={canDelete ? handleDelete : null}
            />
          )}
        </div>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          © {new Date().getFullYear()} Медвежья лавка
        </div>
      </footer>

      <ProductModal
        open={modalOpen}
        mode={modalMode}
        initialProduct={editingProduct}
        onClose={closeModal}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}
