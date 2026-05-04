import React, { useState, useEffect } from "react";
import ShopPage from "./pages/ShopPage/ShopPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import LoginPage from "./pages/LoginPage/LoginPage";
// Страница администрирования пользователей (только для роли admin).
import UsersPanel from "./pages/UserPanel/UsersPanel";
import { api } from "./api";

// =============================================================================
//  Главный компонент приложения.
// =============================================================================
//  Здесь же — корневой «роутинг» (без react-router): мы держим в state
//  текущую страницу и просто рендерим нужный компонент.
//
//  Что важно для практики 11:
//    - В user, который мы сохраняем в state, ОБЯЗАТЕЛЬНО есть поле role.
//      Именно по нему дочерние компоненты решают, что показывать.
//    - Доступ к странице "users" есть только у user.role === "admin".
//      Это первый, "косметический" уровень защиты — основной всё равно
//      делает сервер (он отдаст 403 любому, кто не admin).
// =============================================================================
export default function App() {
  // currentPage может быть: "shop" | "register" | "login" | "users"
  const [currentPage, setCurrentPage] = useState("shop");

  // user = { id, firstName, lastName, email, role, isBlocked, ... } | null
  // null — значит «гость» (не авторизован).
  const [user, setUser] = useState(null);

  // ───────────────────────────────────────────────────────────────────────────
  //  1. ПРОВЕРКА АВТОРИЗАЦИИ ПРИ ЗАГРУЗКЕ (например, после F5)
  // ───────────────────────────────────────────────────────────────────────────
  //  Если в localStorage остался token, пробуем дёрнуть /auth/me.
  //  Если получится — мы по-прежнему авторизованы, восстанавливаем user.
  //  Если нет — interceptor попытается обновить токен через refresh,
  //  и если уже не получится — выкинет нас.
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const userData = await api.getMe();
        setUser(userData);
      } catch (err) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        setUser(null);
        console.error("Сессия истекла");
      }
    };
    checkAuth();
  }, []);

  const navigateTo = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0);
  };

  // ───────────────────────────────────────────────────────────────────────────
  //  2. ВХОД — пришло событие об успешном логине / регистрации.
  // ───────────────────────────────────────────────────────────────────────────
  //  Сохраняем токены, обновляем заголовок Authorization на клиенте,
  //  затем отдельным запросом /auth/me получаем ПОЛНЫЙ профиль (включая role).
  //  Это страховка: даже если LoginPage не передал role — мы её всё равно узнаем.
  const handleLoginSuccess = async (accessToken, userData, refreshToken) => {
    if (accessToken) localStorage.setItem("token", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

    api.apiClient.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;

    try {
      const fullProfile = await api.getMe();
      setUser(fullProfile);
      alert(`С возвращением, ${fullProfile.firstName || "пользователь"}!`);
    } catch (error) {
      console.error("Ошибка при получении профиля:", error);
      // На крайний случай используем то, что прислал сервер при логине.
      setUser(userData);
    }
  };

  // 3. ВЫХОД — чистим токены и состояние.
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    setUser(null);
    navigateTo("shop");
  };

  // ───────────────────────────────────────────────────────────────────────────
  //  Страница "users" — только админу. Если по какой-то причине туда попал
  //  не-админ (например, refresh странички), просто отрисуем магазин.
  // ───────────────────────────────────────────────────────────────────────────
  const isAdmin = user?.role === "admin";

  return (
    <div className="app-container">
      {currentPage === "shop" && (
        <ShopPage
          user={user}
          onLogout={handleLogout}
          onNavigate={() => navigateTo("login")}
          // Админу даём перейти в панель управления пользователями.
          onOpenUsers={isAdmin ? () => navigateTo("users") : null}
        />
      )}

      {currentPage === "users" && isAdmin && (
        <UsersPanel
          currentUserId={user.id}
          onBack={() => navigateTo("shop")}
        />
      )}

      {/* Защита: если не админ, но как-то попал на "users" — отрисуем магазин */}
      {currentPage === "users" && !isAdmin && (
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
          onSuccess={(token, userData, refreshToken) => {
            handleLoginSuccess(token, userData, refreshToken);
            navigateTo("shop");
          }}
        />
      )}

      {currentPage === "login" && (
        <LoginPage
          onNavigate={() => navigateTo("register")}
          onSuccess={(token, userData, refreshToken) => {
            handleLoginSuccess(token, userData, refreshToken);
            navigateTo("shop");
          }}
        />
      )}
    </div>
  );
}
