import assert from 'node:assert/strict';
import { createApp } from '../src/server.js';

const products = [
  { name: 'Wireless Earbuds', price: 99.99, category: 'electronics' },
  { name: 'Mechanical Keyboard', price: 149.99, category: 'electronics' },
  { name: 'Gaming Mouse', price: 59.99, category: 'electronics' },
  { name: '4K Monitor', price: 399.99, category: 'electronics' },
  { name: 'Cotton T-Shirt', price: 19.99, category: 'clothing' },
  { name: 'Denim Jeans', price: 49.99, category: 'clothing' },
  { name: 'Winter Jacket', price: 120, category: 'clothing' },
  { name: 'JavaScript: The Good Parts', price: 29.99, category: 'books' },
  { name: 'Clean Code', price: 45, category: 'books' },
  { name: 'Design Patterns', price: 55, category: 'books' }
];

const productModel = {
  async find(filter) {
    return filter.category
      ? products.filter((product) => product.category === filter.category)
      : products;
  }
};

const app = createApp({ productModel });
const server = app.listen(0);
await new Promise((resolve) => server.once('listening', resolve));
const { port } = server.address();

try {
  const allProductsResponse = await fetch(`http://127.0.0.1:${port}/api/products`);
  const allProducts = await allProductsResponse.json();
  assert.equal(allProductsResponse.status, 200);
  assert.equal(allProducts.length, 10);

  const electronicsResponse = await fetch(`http://127.0.0.1:${port}/api/products?category=electronics`);
  const electronics = await electronicsResponse.json();
  assert.equal(electronicsResponse.status, 200);
  assert.equal(electronics.length, 4);

  const originalConsoleError = console.error;
  let controllerErrorWasLogged = false;
  console.error = (...args) => {
    controllerErrorWasLogged = args[0] === 'getProducts failed:';
    originalConsoleError(...args);
  };
  const failingApp = createApp({
    productModel: {
      async find() {
        throw new Error('database unavailable');
      }
    }
  });
  const failingServer = failingApp.listen(0);
  await new Promise((resolve) => failingServer.once('listening', resolve));
  const failingPort = failingServer.address().port;
  const failureResponse = await fetch(`http://127.0.0.1:${failingPort}/api/products`);
  const failureBody = await failureResponse.json();
  await new Promise((resolve, reject) => failingServer.close((error) => error ? reject(error) : resolve()));
  console.error = originalConsoleError;
  assert.equal(failureResponse.status, 500);
  assert.deepEqual(failureBody, { error: 'Server error' });
  assert.equal(controllerErrorWasLogged, true);

  console.log(`Verified GET /api/products returned ${allProducts.length} products.`);
  console.log(`Verified GET /api/products?category=electronics returned ${electronics.length} products.`);
  console.log('Verified controller failures emit console.error before returning HTTP 500.');
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
