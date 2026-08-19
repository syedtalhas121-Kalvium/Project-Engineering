const API_URL = 'http://localhost:3001';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'The request could not be completed');
  }
  return data;
};

export const fetchCart = () => request('/cart');

export const addItem = (item) => request('/cart/item', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(item),
});

export const deleteItem = (id, currentUser) => request(`/cart/item/${id}`, {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currentUser }),
});

export const confirmPayment = (payment) => request('/cart/pay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payment),
});
