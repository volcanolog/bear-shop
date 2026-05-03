import React, { useState } from "react";
import { api } from "../../api";
import "../RegisterPage/RegisterPage.css"; // Используем те же стили

export default function LoginPage({ onNavigate, onSuccess }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await api.login({ email, password });
            alert(`С возвращением, ${data.user.firstName}!`);
            onSuccess({ firstName: data.user.firstName || data.user.firstName }); // Уводим в магазин после успешного входа
        } catch (error) {
            alert(error.response?.data?.error || "Неверный логин или пароль");
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <h2 className="auth-card__title">Вход</h2>
                <p className="auth-card__subtitle">Рады видеть вас снова!</p>

                <form onSubmit={handleSubmit}>
                    <div className="auth-form__group">
                        <label className="auth-form__label">Email</label>
                        <input 
                            className="auth-form__input"
                            type="email"
                            placeholder="mail@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="auth-form__group">
                        <label className="auth-form__label">Пароль</label>
                        <input 
                            className="auth-form__input"
                            type="password"
                            placeholder="••••••••"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button type="submit" className="auth-form__submit">
                        Войти
                    </button>
                </form>

                <div className="auth-footer">
                    <span>Нет аккаунта?</span>
                    <span className="auth-footer__link" onClick={onNavigate}>
                        Зарегистрироваться
                    </span>
                </div>
            </div>
        </div>
    );
}