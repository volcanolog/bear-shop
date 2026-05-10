import axios from "axios";

const SERVER_URL = "http://localhost:3000";

export const apiClient = axios.create({
  baseURL: `${SERVER_URL}/api`,
  headers: {
    "Content-Type": "application/json",
    "accept": "application/json",
  },
});

// ─── REQUEST INTERCEPTOR ──────────────────────────────────────────────────────
// Автоматически добавляем accessToken в каждый запрос
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── RESPONSE INTERCEPTOR ─────────────────────────────────────────────────────
//
//  Логика на каждый ответ:
//    1) если ответ нормальный — отдаём как есть;
//    2) если пришёл 401 и есть оба токена — пытаемся «тихо» обновить пару
//       через /auth/refresh и повторить исходный запрос;
//    3) если токенов нет ИЛИ обновление не удалось — чистим хранилище
//       и просто реджектим ошибку. ВАЖНО: НЕ делаем window.location.href —
//       это вызывало перезагрузку страницы, после которой ShopPage снова
//       сразу запрашивал /api/products → снова 401 → снова перезагрузка.
//       Получался вечный цикл.
//
//  React-приложение само разберётся: App.js увидит, что getMe не сработал,
//  установит user = null, ShopPage перестанет грузить товары и покажет
//  приглашение войти.
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const accessToken = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");
    const originalRequest = error.config;

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      // ШАГ 1: Если хотя бы одного токена нет — пользователь не авторизован.
      // Просто отдаём ошибку наверх. Никаких редиректов.
      if (!accessToken || !refreshToken) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        return Promise.reject(error);
      }

      try {
        // ШАГ 2: Пробуем обновить токены.
        // Делаем «голым» axios, а не apiClient — иначе при 401 во время
        // refresh мы рекурсивно влетели бы в interceptor.
        const res = await axios.post(`${SERVER_URL}/api/auth/refresh`, {
          refreshToken,
        });

        // ШАГ 3: Сохраняем новую пару токенов.
        const newAccessToken = res.data.accessToken;
        const newRefreshToken = res.data.refreshToken;
        localStorage.setItem("token", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        // ШАГ 4: Повторяем исходный запрос с новым токеном.
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // ШАГ 5: Refresh не удался — сессия закончилась.
        // Чистим токены и реджектим ошибку (без редиректа).
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ─── Вспомогательная функция для картинок ─────────────────────────────────────
export const getPictureUrl = (pictureName) => {
  if (!pictureName) return `${SERVER_URL}/pictures/no-photo.png`;
  return `${SERVER_URL}/pictures/${pictureName}`;
};

// ─── API МЕТОДЫ ───────────────────────────────────────────────────────────────
// Удобная обёртка над apiClient: один объект — все вызовы серверного API.
// Ошибки 401 здесь не обрабатываются — это работа interceptor-а выше.
export const api = {
  apiClient,

  // ── Авторизация / профиль ──────────────────────────────────────────────────
  login: (data) => apiClient.post("/auth/login", data).then((res) => res.data),
  register: (data) => apiClient.post("/auth/register", data).then((res) => res.data),
  // /auth/me возвращает текущего пользователя ВКЛЮЧАЯ роль (role).
  // На фронте именно отсюда мы узнаём, что показывать пользователю
  // (кнопки «Создать», «Удалить», «Пользователи» и т.д.).
  getMe: () => apiClient.get("/auth/me").then((res) => res.data),

  // ── Товары ─────────────────────────────────────────────────────────────────
  getProducts: () => apiClient.get("/products").then((res) => res.data),
  getProductById: (id) => apiClient.get(`/products/${id}`).then((res) => res.data),
  createProduct: (data) => apiClient.post("/products", data).then((res) => res.data),
  // По заданию обновление товара должно идти через PUT.
  updateProduct: (id, data) => apiClient.put(`/products/${id}`, data).then((res) => res.data),
  deleteProduct: (id) => apiClient.delete(`/products/${id}`).then((res) => res.data),

  // ── Управление пользователями (только admin) ───────────────────────────────
  // На сервере все эти эндпоинты защищены roleMiddleware([ADMIN]),
  // т.е. если их случайно вызовет не-админ — придёт 403, и фронт это
  // покажет. Но мы дополнительно прячем кнопки на UI.
  getUsers: () => apiClient.get("/users").then((res) => res.data),
  getUserById: (id) => apiClient.get(`/users/${id}`).then((res) => res.data),
  updateUser: (id, data) => apiClient.put(`/users/${id}`, data).then((res) => res.data),
  // DELETE на сервере = блокировка пользователя (мягкое удаление).
  blockUser: (id) => apiClient.delete(`/users/${id}`).then((res) => res.data),
};