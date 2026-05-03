import React, { useState, useEffect } from "react";
import ShopPage from "./pages/ShopPage/ShopPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import { api } from "./api";

export default function App() {
  const [currentPage, setCurrentPage] = useState("shop");
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // 1. ПРОВЕРКА АВТОРИЗАЦИИ ПРИ ЗАГРУЗКЕ (F5)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await api.getMe(); 
          setUser(userData);
        } catch (err) {
          localStorage.removeItem('token');
          setUser(null);
        }
      }
    };
    checkAuth();
  }, []);

  const navigateTo = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0); 
  };

  // 2. КРАСИВАЯ АВТОРИЗАЦИЯ (Вход -> Токен -> Данные пользователя)
  const handleLoginSuccess = async (token, userData) => {
    setIsLoggedIn(true);
    localStorage.setItem('token', token);
    api.apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    try {
        const fullProfile = await api.getMe();
        setUser(fullProfile);
        setIsLoggedIn(true);
        alert(`С возвращением, ${fullProfile.firstName}!`);
    } catch (error) {
        console.error("Ошибка при получении профиля после входа:", error);
        setUser(userData);
        setIsLoggedIn(true);
    }
};

  // 3. ВЫХОД (Очистка всего)
  const handleLogout = () => {
    localStorage.removeItem('token');
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
        />
      )}

      {currentPage === "login" && (
        <LoginPage 
          onNavigate={() => navigateTo("register")} 
          onSuccess={(token, user) => {
            handleLoginSuccess(token, user);
            navigateTo("shop"); // Вот эта строка отправит тебя в магазин после входа
    }} 
  />
)}
    </div>
  );
}