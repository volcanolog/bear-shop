import React, { useState } from "react";
import { api } from "../../api";
import "./RegisterPage.css";

export default function RegisterPage({ onNavigate, onSuccess }) {
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await api.register(formData);

            // Если сервер сразу возвращает токены после регистрации —
            // сохраняем их и входим автоматически
            if (data && data.accessToken) {
                localStorage.setItem("token", data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);
                // Третьим аргументом отдаём refreshToken — для совместимости с App.js
                onSuccess(data.accessToken, data.user, data.refreshToken);
            } else {
                // Если сервер не вернул токены — просто переходим на логин
                alert("Регистрация успешна! Войдите в аккаунт.");
                onNavigate();
            }
        } catch (error) {
            alert(error.response?.data?.error || "Ошибка при регистрации");
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2 className="auth-card__title">Bear Shop</h2>
                <p className="auth-card__subtitle">Создайте аккаунт для покупок</p>

                <form onSubmit={handleSubmit}>
                    <div className="auth-form__group">
                        <label className="auth-form__label">Имя</label>
                        <input
                            className="auth-form__input"
                            placeholder="Иван"
                            required
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Фамилия</label>
                        <input
                            className="auth-form__input"
                            placeholder="Иванов"
                            required
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Email</label>
                        <input
                            className="auth-form__input"
                            type="email"
                            placeholder="mail@example.com"
                            required
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Пароль</label>
                        <input
                            className="auth-form__input"
                            type="password"
                            placeholder="••••••••"
                            required
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="auth-form__submit">
                        Зарегистрироваться
                    </button>
                </form>

                <div className="auth-footer">
                    <span>Уже есть аккаунт?</span>
                    <span className="auth-footer__link" onClick={onNavigate}>
                        Войти
                    </span>
                </div>
            </div>
        </div>
    );
}