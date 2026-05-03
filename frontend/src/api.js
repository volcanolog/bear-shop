import axios from "axios";

const SERVER_URL = "http://localhost:3000";

export const apiClient = axios.create({
  baseURL: `${SERVER_URL}/api`,
  headers: {
    "Content-Type": "application/json",
    "accept": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== "undefined") {
    config.headers.Authorization = `Bearer ${token}`; // Формат согласно методичке
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response, // Если всё ок, просто пропускаем ответ
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true; // Ставим метку, чтобы не зациклиться
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const res = await axios.post("http://localhost:3000/api/auth/refresh", {
          refreshToken: refreshToken
        });
        localStorage.setItem("token", res.data.accessToken);
        localStorage.setItem("refreshToken", res.data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.reload(); // Отправит на логин
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const getPictureUrl = (pictureName) => {
  if (!pictureName) return `${SERVER_URL}/pictures/no-photo.png`;
  return `${SERVER_URL}/pictures/${pictureName}`;
};

export const api = {
  apiClient,
  // --- ТОВАРЫ (теперь защищены токеном через интерцептор) ---
  createProduct: async (product) => {
    const response = await apiClient.post("/products", product);
    return response.data;
  },

  getProducts: async () => {
    const response = await apiClient.get("/products");
    return response.data;
  },

  getProductById: async (id) => {
    const response = await apiClient.get(`/products/${id}`);
    return response.data;
  },

  updateProduct: async (id, product) => {
    const response = await apiClient.patch(`/products/${id}`, product);
    return response.data;
  },

  deleteProduct: async (id) => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  // --- АВТОРИЗАЦИЯ ---
  register: async (userData) => {
    const response = await apiClient.post("/auth/register", userData);
    return response.data;
  },

  login: async (credentials) => {
    const response = await apiClient.post("/auth/login", credentials);
    if (response.data.accessToken && response.data.refreshToken) {
      localStorage.setItem('token', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;
    }
    return response.data; 
  },

  getMe: async () => {
    const response = await apiClient.get("/auth/me");
    return response.data;
  }
};