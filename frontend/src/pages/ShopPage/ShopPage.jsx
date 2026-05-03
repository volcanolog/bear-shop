import React, { useEffect, useState } from "react";
import "./ShopPage.css";

import ProductsList from "../../components/ProductsList/ProductsList";
import ProductModal from "../../components/ProductModal/ProductModal";
import { api } from "../../api";

export default function ShopPage({ onNavigate, user, onLogout }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingProduct, setEditingProduct] = useState(null);

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
      // Ошибка 401 обрабатывается interceptor-ом автоматически
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
    const ok = window.confirm("Удалить товар?");
    if (!ok) return;
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
                </span>
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
            {user && (
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
              onEdit={user ? openEdit : null}
              onDelete={user ? handleDelete : null}
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