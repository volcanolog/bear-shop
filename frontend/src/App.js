import React, { useState, useEffect } from "react";
import ShopPage from "./pages/ShopPage/ShopPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import { api } from "./api";

export default function App() {
  const [currentPage, setCurrentPage] = useState("shop");
  const [user, setUser] = useState(null);

  // 1. ПРОВЕРКА АВТОРИЗАЦИИ ПРИ ЗАГРУЗКЕ (F5)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const userData = await api.getMe();
          setUser(userData);
        } catch (err) {
          // Interceptor уже попробовал обновить токен и не смог — чистим всё
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken"); // ИСПРАВЛЕНО: тоже удаляем
          setUser(null);
          console.error("Сессия истекла");
        }
      }
    };
    checkAuth();
  }, []);

  const navigateTo = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // 2. ВХОД — токены уже сохранены в LoginPage, здесь только обновляем состояние
  const handleLoginSuccess = async (accessToken, userData, refreshToken) => {
    // Токены сохраняет LoginPage, но на случай если вызов пришёл из другого места
    if (accessToken) localStorage.setItem("token", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

    api.apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

    try {
      const fullProfile = await api.getMe();
      setUser(fullProfile);
      alert(`С возвращением, ${fullProfile.firstName || "пользователь"}!`);
    } catch (error) {
      console.error("Ошибка при получении профиля:", error);
      setUser(userData);
    }
  };

  // 3. ВЫХОД — чистим ОБА токена
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken"); // ИСПРАВЛЕНО: раньше не удалялся
    setUser(null);
    navigateTo("shop");
  };

  return (
    <div className="app-container">
      {currentPage === "shop" && (
        <ShopPage
          user={user}
          onLogout={handleLogout}
          onNavigate={() => navigateTo("login")}
        />
      )}

      {currentPage === "register" && (
        <RegisterPage
          onNavigate={() => navigateTo("login")}
          onBack={() => navigateTo("shop")}
          // ИСПРАВЛЕНО: передаём onSuccess чтобы после регистрации сразу войти
          onSuccess={(token, userData) => {
            handleLoginSuccess(token, userData);
            navigateTo("shop");
          }}
        />
      )}

      {currentPage === "login" && (
        <LoginPage
          onNavigate={() => navigateTo("register")}
          // ИСПРАВЛЕНО: передаём refreshToken третьим аргументом
          onSuccess={(token, userData, refreshToken) => {
            handleLoginSuccess(token, userData, refreshToken);
            navigateTo("shop");
          }}
        />
      )}
    </div>
  );
}