import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

apiClient.interceptors.response.use(
  response => response,
  error => {
    const status = error.response?.status

    if (status === 401) {
      error.message = 'Session expired. Please log in again.'
    } else if (status >= 500) {
      error.message = 'Server error. Please try again later.'
    } else if (!error.response) {
      error.message = 'Network error. Please check your connection.'
    }

    return Promise.reject(error)
  },
)

const unwrap = response => response.data

export const getProducts = () => apiClient.get('/products').then(unwrap)

export const getProduct = (id) => apiClient.get(`/products/${id}`).then(unwrap)

export const getProductsByCategory = (category) =>
  apiClient.get(`/products/category/${category}`).then(unwrap)

export const getCategories = () => apiClient.get('/products/categories').then(unwrap)

export const addToCart = (data) => apiClient.post('/carts', data).then(unwrap)

export const getCart = (userId) => apiClient.get(`/carts/user/${userId}`).then(unwrap)

export const deleteCartItem = (id) => apiClient.delete(`/carts/${id}`).then(unwrap)

export const getUser = (id) => apiClient.get(`/users/${id}`).then(unwrap)

export const updateUser = (id, data) => apiClient.put(`/users/${id}`, data).then(unwrap)

export const submitReview = (data) => apiClient.post('/users', data).then(unwrap)

export default apiClient
