import React from "react";
import { getPictureUrl } from '../../api';

export default function ProductItem({ product, onEdit, onDelete }) {
  const stars =
    "★".repeat(Math.round(product.rating)) +
    "☆".repeat(5 - Math.round(product.rating));
  const placeholder = getPictureUrl("no-photo.png");

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

      <div className="productActions">
        <button className="btn" onClick={() => onEdit(product)}>
          Редактировать
        </button>
        <button className="btn btn--danger" onClick={() => onDelete(product.id)}>
          Удалить
        </button>
      </div>
    </div>
  );
}
