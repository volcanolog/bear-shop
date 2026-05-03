import React, { useEffect, useState } from "react";

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
  const [name, setName]             = useState("");
  const [category, setCategory]     = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice]           = useState("");
  const [stock, setStock]           = useState("");
  const [rating, setRating]         = useState("");
  const [picture, setPicture]       = useState("");

  useEffect(() => {
    if (!open) return;

    setName(initialProduct?.name ?? "");
    setCategory(initialProduct?.category ?? "");
    setDescription(initialProduct?.description ?? "");
    setPrice(initialProduct?.price != null ? String(initialProduct.price) : "");
    setStock(initialProduct?.stock != null ? String(initialProduct.stock) : "");
    setRating(initialProduct?.rating != null ? String(initialProduct.rating) : "");
    setPicture(initialProduct?.picture ?? "");
  }, [open, initialProduct]);

  if (!open) return null;

  const title =
    mode === "edit" ? "Редактирование товара" : "Создание товара";

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedName = name.trim();
    const trimmedCategory = category.trim();
    const trimmedDescription = description.trim();
    const parsedPrice = Number(price);
    const parsedStock = Number(stock);
    const parsedRating = Number(rating);

    if (!trimmedName) {
      alert("Введите название");
      return;
    }
    if (!trimmedCategory) {
      alert("Введите категорию");
      return;
    }
    if (!trimmedDescription) {
      alert("Введите описание");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      alert("Введите корректную цену (≥ 0)");
      return;
    }
    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      alert("Введите корректное количество (≥ 0)");
      return;
    }

    onSubmit({
      id: initialProduct?.id,
      name: trimmedName,
      category: trimmedCategory,
      description: trimmedDescription,
      price: parsedPrice,
      stock: parsedStock,
      rating: parsedRating || 0,
      picture: picture.trim(),
    });
  };

  return (
    <div className="backdrop" onMouseDown={onClose}>
      <div
        className="modal"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal__header">
          <div className="modal__title">{title}</div>
          <button className="iconBtn" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Название
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например, Тедди Классик"
              autoFocus
            />
          </label>

          <label className="label">
            Категория
            <input
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Например, Классические"
            />
          </label>

          <label className="label">
            Имя файла картинки
            <input
              className="input"
              value={picture}
              onChange={(e) => setPicture(e.target.value)}
              placeholder="Например, teddy.jpg"
            />
            <span style={{ fontSize: '10px', opacity: 0.6 }}>
              Файл должен лежать в папке /pictures
            </span>
          </label>

          <label className="label">
            Описание
            <textarea
              className="input input--textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите товар..."
              rows={3}
            />
          </label>

          <div className="formRow">
            <label className="label">
              Цена (₽)
              <input
                className="input"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Например, 1290"
                inputMode="numeric"
              />
            </label>

            <label className="label">
              Остаток (шт.)
              <input
                className="input"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Например, 10"
                inputMode="numeric"
              />
            </label>
          </div>

          <label className="label">
            Рейтинг (0–5)
            <input
              className="input"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              placeholder="Например, 4.8"
              inputMode="decimal"
            />
          </label>

          <div className="modal__footer">
            <button type="button" className="btn" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary">
              {mode === "create" ? "Создать" : "Сохранить"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
