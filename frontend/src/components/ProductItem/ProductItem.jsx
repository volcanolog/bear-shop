import React from "react";
import { getPictureUrl } from "../../api";

// =============================================================================
//  Карточка одного товара.
// =============================================================================
//  Здесь применяется типичный для RBAC-фронта приём:
//    - кнопка показывается только если соответствующий обработчик ПЕРЕДАН.
//    - решение о том, передавать ли обработчик, принимает родитель (ShopPage)
//      на основе роли пользователя.
//
//  Иначе говоря, ProductItem НЕ знает про роли — он просто умеет:
//    "если есть onEdit  → нарисовать кнопку «Редактировать»",
//    "если есть onDelete → нарисовать кнопку «Удалить»".
//  Это упрощает компонент и делает его переиспользуемым.
// =============================================================================
export default function ProductItem({ product, onEdit, onDelete }) {
  const stars =
    "★".repeat(Math.round(product.rating)) +
    "☆".repeat(5 - Math.round(product.rating));

  // Если в карточке вообще не положено никаких действий — не рендерим
  // блок с кнопками, чтобы он не занимал место.
  const hasActions = Boolean(onEdit) || Boolean(onDelete);

  return (
    <div className="productRow">
      <div className="productTop">
        <span className="badge">{product.category}</span>
        <span className="rating">
          {stars} <span>{product.rating}</span>
        </span>
      </div>
      <div className="productImageContainer">
        <img
          src={getPictureUrl(product.picture)}
          alt={product.name}
          className="productPicture"
        />
      </div>
      <div className="productName">{product.name}</div>
      <div className="productDesc">{product.description}</div>

      <div className="productMeta">
        <div className="productPrice">
          {product.price.toLocaleString("ru-RU")} ₽
        </div>
        <div className={`productStock${product.stock === 0 ? " productStock--out" : ""}`}>
          {product.stock > 0 ? `Склад: ${product.stock} шт.` : "Нет в наличии"}
        </div>
      </div>

      {hasActions && (
        <div className="productActions">
          {/* Редактировать — для seller и admin (передаётся onEdit) */}
          {onEdit && (
            <button className="btn" onClick={() => onEdit(product)}>
              Редактировать
            </button>
          )}
          {/* Удалить — только для admin (передаётся onDelete) */}
          {onDelete && (
            <button className="btn btn--danger" onClick={() => onDelete(product.id)}>
              Удалить
            </button>
          )}
        </div>
      )}
    </div>
  );
}
