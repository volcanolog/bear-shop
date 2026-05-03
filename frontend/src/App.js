import React, { useState } from "react"; 
import ShopPage from "./pages/ShopPage/ShopPage";
import RegisterPage from "./pages/RegisterPage/RegisterPage";
import LoginPage from "./pages/LoginPage/LoginPage";

export default function App() {
  const [currentPage, setCurrentPage] = useState("shop");
  const navigateTo = (page) => {
    setCurrentPage(page);
    window.scrollTo(0, 0); // Прокрутка вверх при смене экрана
  };
  return (
    <div className="app-container">
      {/* Условный рендеринг */}
      {currentPage === "shop" && (
        <ShopPage onNavigate={() => setCurrentPage("login")} />
      )}

      {currentPage === "register" && (
        <RegisterPage 
          onNavigate={() => setCurrentPage("login")} 
          onBack={() => setCurrentPage("shop")}
        />
      )}

      {currentPage === "login" && (
        <LoginPage 
          onNavigate={() => setCurrentPage("register")} 
          onSuccess={() => setCurrentPage("shop")} 
        />
      )}
    </div>
  );
}
