import React, { useState, useEffect } from "react"; // 1. Добавили useEffect в импорт
import ShopPage from "./pages/ShopPage/ShopPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import LoginPage from "./pages/LoginPage/LoginPage";
import { api } from "./api"; // 2. Импортируем api

export default function App() {
  const [currentPage, setCurrentPage] = useState("shop");
  const [user, setUser] = useState(null);

  // 3. ПРОВЕРКА АВТОРИЗАЦИИ ПРИ ЗАГРУЗКЕ (Требование Практики №8)
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Запрашиваем данные пользователя по токену
          const userData = await api.getMe(); 
          setUser(userData);
        } catch (err) {
          // Если токен просрочен или неверен — удаляем его
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

  const handleLoginSuccess = (userData) => {
    setUser(userData); 
    navigateTo("shop");
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); // 4. УДАЛЯЕМ ТОКЕН ПРИ ВЫХОДЕ
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
          onSuccess={handleLoginSuccess} 
        />
      )}
    </div>
  );
}