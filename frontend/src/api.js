import axios from "axios";

// 1. Определяем базовый адрес сервера
const SERVER_URL = "http://localhost:3000";

// 2. Создаем клиент axios для API-запросов
const apiClient = axios.create({
  baseURL: `${SERVER_URL}/api`,
  headers: {
    "Content-Type": "application/json",
    "accept": "application/json",
  },
});

// 3. Функция для получения URL картинок (теперь SERVER_URL определен!)
export const getPictureUrl = (pictureName) => {
  if (!pictureName) return `${SERVER_URL}/pictures/no-photo.png`;
  return `${SERVER_URL}/pictures/${pictureName}`;
};

// 4. Основной объект API
export const api = {
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
};

// 5. Для совместимости, если где-то остался вызов getProducts не через объект api
export const getProducts = api.getProducts;