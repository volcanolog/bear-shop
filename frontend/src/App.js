import React, { useState } from "react"; 
import ShopPage from "./pages/ShopPage/ShopPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import LoginPage from "./pages/LoginPage/LoginPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState("shop");
  const [user, setUser] = useState(null);
  // Универсальная функция для смены страниц со сбросом скролла
  const navigateTo = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0); 
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData); // Сохраняем пользователя (например, { firstName: 'Иван' })
    navigateTo("shop");
  };

  const handleLogout = () => {
    setUser(null);
    navigateTo("shop");
  };

  return (
    <div className="app-container">
      {/* Магазин: передаем user и функцию выхода */}
      {currentPage === "shop" && (
        <ShopPage 
          user={user} 
          onLogout={handleLogout} 
          onNavigate={() => navigateTo("login")} 
        />
      )}

      {/* Регистрация */}
      {currentPage === "register" && (
        <RegisterPage 
          onNavigate={() => navigateTo("login")} 
          onBack={() => navigateTo("shop")}
        />
      )}

      {/* Вход: передаем handleLoginSuccess вместо обычной навигации */}
      {currentPage === "login" && (
        <LoginPage 
          onNavigate={() => navigateTo("register")} 
          onSuccess={handleLoginSuccess} 
        />
      )}
    </div>
  );
}