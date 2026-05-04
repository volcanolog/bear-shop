import React, { useState } from "react";
import { api } from "../../api";
import "./LoginPage.css";

const LoginPage = ({ onSuccess, onNavigate }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await api.login({ email, password });
            if (data && data.accessToken) {
                // Сохраняем ОБА токена в localStorage
                localStorage.setItem("token", data.accessToken);
                localStorage.setItem("refreshToken", data.refreshToken);
                // Третьим аргументом отдаём refreshToken — на случай, если App.js
                // захочет с ним что-то сделать (продублировать сохранение и т.п.).
                onSuccess(data.accessToken, data.user, data.refreshToken);
            }
        } catch (err) {
            alert(err.response?.data?.error || "Неверный логин или пароль");
        }
    };

    return (
        <div className="page login-page-flex">
            <div className="modal">
                <div className="modal__header">
                    <span className="modal__title">Авторизация</span>
                </div>
        
                <form className="form" onSubmit={handleSubmit}>
                    <label className="label">
                        Email
                        <input
                            className="input"
                            type="email"
                            placeholder="example@mail.ru"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </label>

                    <label className="label">
                        Пароль
                        <input
                            className="input"
                            type="password"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </label>

                    <button className="btn btn--primary" type="submit" style={{ marginTop: "10px" }}>
                        Войти
                    </button>

                    <div className="modal__footer" style={{ justifyContent: "center", marginTop: "15px" }}>
                        <span style={{ fontSize: "13px", opacity: 0.7 }}>Нет аккаунта?</span>
                        <button
                            type="button"
                            className="btn"
                            onClick={onNavigate}
                            style={{ border: "none", padding: "0 5px", color: "#818cf8" }}
                        >
                            Создать
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;
