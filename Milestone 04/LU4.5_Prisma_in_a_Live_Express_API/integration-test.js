const assert = require('node:assert/strict');

const baseUrl = process.env.API_URL || 'http://127.0.0.1:3100';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'content-type': 'application/json' },
    ...options,
  });
  const body = await response.json();
  return { response, body };
}

async function main() {
  let result = await request('/products');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.length, 2);
  assert.equal(result.body[0].stock, 5);

  result = await request('/products/99999');
  assert.equal(result.response.status, 404);
  assert.equal(result.body.error, 'Product not found');

  result = await request('/orders/purchase', {
    method: 'POST',
    body: JSON.stringify({ userId: 1, productId: 1 }),
  });
  assert.equal(result.response.status, 201);
  assert.equal(result.body.order.userId, 1);
  assert.equal(result.body.order.productId, 1);

  result = await request('/products/1');
  assert.equal(result.response.status, 200);
  assert.equal(result.body.stock, 4);

  result = await request('/orders/99999');
  assert.equal(result.response.status, 200);
  assert.deepEqual(result.body, []);

  result = await request('/orders/purchase', {
    method: 'POST',
    body: JSON.stringify({ userId: 1, productId: 99999 }),
  });
  assert.equal(result.response.status, 404);
  assert.equal(result.body.error, 'Product not found');

  console.log('All API integration assertions passed.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
