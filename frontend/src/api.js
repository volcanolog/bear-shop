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
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const accessToken = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // ШАГ 1: Если одного из токенов нет — позволяем ошибке сработать
      if (!accessToken || !refreshToken) {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/";  // редирект на главную, App.jsx покажет LoginPage
        return Promise.reject(error);
      }

      try {
        // ШАГ 2: Пробуем обновить токены
        const res = await axios.post(`${SERVER_URL}/api/auth/refresh`, {
          refreshToken,
        });

        // ШАГ 3: Проверяем, не истёк ли refresh-токен
        const isRefreshExpired = res.data.refresh_expired;
        if (isRefreshExpired) {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          window.location.href = "/";
          return Promise.reject(error);
        }

        // ШАГ 4: Сохраняем новые токены
        const newAccessToken = res.data.accessToken;
        const newRefreshToken = res.data.refreshToken; // ИСПРАВЛЕНО: было newRefreshToken

        localStorage.setItem("token", newAccessToken);
        localStorage.setItem("refreshToken", newRefreshToken);

        // ШАГ 5: Повторяем исходный запрос с новым токеном
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        // ШАГ 6: Если обновление не удалось — выходим
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        window.location.href = "/";
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