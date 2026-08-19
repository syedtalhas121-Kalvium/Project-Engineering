const test = require('node:test');
const { afterEach } = test;
const assert = require('node:assert/strict');
const http = require('node:http');
const db = require('../db');
const app = require('../app');

const users = [
  { id: 1, tenant_id: 1, full_name: 'Alice Johnson', email: 'alice@pouch.io', role: 'admin', salary: '125000.00' },
  { id: 2, tenant_id: 1, full_name: 'Bob Smith', email: 'bob@pouch.io', role: 'manager', salary: '95000.00' },
  { id: 3, tenant_id: 2, full_name: 'Charlie Davis', email: 'charlie@velocity.com', role: 'admin', salary: '140000.00' },
  { id: 4, tenant_id: 2, full_name: 'David Miller', email: 'david@velocity.com', role: 'user', salary: '75000.00' }
];
const projects = [
  { id: 1, tenant_id: 1, name: 'Pouch Portal', description: 'Customer portal for Pouch.io', status: 'active', budget: '50000.00', owner_id: 1 },
  { id: 2, tenant_id: 2, name: 'Velocity Engine', description: 'Back-end engine for Velocity', status: 'active', budget: '120000.00', owner_id: 3 },
  { id: 3, tenant_id: 1, name: 'Secret R&D', description: null, status: 'inactive', budget: '250000.00', owner_id: 1 }
];
const memberships = [
  [1, 1, 1], [1, 1, 2], [1, 3, 1], [2, 2, 3], [2, 2, 4]
];
const queries = [];

function projectIdsForUser(tenantId, userId) {
  return memberships
    .filter(([membershipTenant, , memberId]) => membershipTenant === tenantId && memberId === userId)
    .map(([, projectId]) => projectId);
}

function teamUserIds(tenantId, userId) {
  const projectIds = projectIdsForUser(tenantId, userId);
  return memberships
    .filter(([membershipTenant, projectId]) => membershipTenant === tenantId && projectIds.includes(projectId))
    .map(([, , memberId]) => memberId);
}

function mockQuery(text, params = []) {
  queries.push({ text, params });

  if (text.includes('FROM users') && text.includes('id = $1 AND tenant_id = $2')) {
    const [userId, tenantId] = params;
    return Promise.resolve({ rows: users.filter((user) => user.id === userId && user.tenant_id === tenantId) });
  }

  if (text.includes('FROM users u')) {
    const [tenantId, viewerId, requestedId] = params;
    const allowed = teamUserIds(tenantId, viewerId);
    return Promise.resolve({ rows: users.filter((user) => user.tenant_id === tenantId && allowed.includes(user.id) && (requestedId === undefined || user.id === requestedId)) });
  }

  if (text.includes('FROM users')) {
    const [tenantId, requestedId] = params;
    return Promise.resolve({ rows: users.filter((user) => user.tenant_id === tenantId && (requestedId === undefined || user.id === requestedId)) });
  }

  if (text.includes('FROM projects p') && text.includes('JOIN project_members')) {
    if (params.length === 2) {
      const [tenantId, userId] = params;
      const allowed = projectIdsForUser(tenantId, userId);
      return Promise.resolve({ rows: projects.filter((project) => project.tenant_id === tenantId && allowed.includes(project.id)) });
    }
    const [tenantId, projectId, userId] = params;
    const allowed = projectIdsForUser(tenantId, userId);
    return Promise.resolve({ rows: projects.filter((project) => project.tenant_id === tenantId && project.id === projectId && allowed.includes(project.id)) });
  }

  if (text.includes('FROM projects p')) {
    const [tenantId, projectId] = params;
    return Promise.resolve({ rows: projects.filter((project) => project.tenant_id === tenantId && (projectId === undefined || project.id === projectId)) });
  }

  throw new Error(`Unhandled test query: ${text}`);
}

afterEach(() => {
  queries.length = 0;
});

test.before(() => {
  db.query = mockQuery;
});

test.after(() => {
  delete db.query;
});

function request(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const req = http.request({
        hostname: '127.0.0.1',
        port: address.port,
        path,
        headers
      }, (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          server.close();
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        });
      });
      req.on('error', (err) => { server.close(); reject(err); });
      req.end();
    });
  });
}

test('protected endpoints require tenant and user context', async () => {
  const response = await request('/users');
  assert.equal(response.status, 400);
  assert.match(response.body.error, /x-tenant-id/);
});

test('admin access is tenant-scoped and includes salary only for that tenant', async () => {
  const response = await request('/users', { 'x-tenant-id': '1', 'x-user-id': '1' });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.map((user) => user.id), [1, 2]);
  assert.equal(response.body[0].salary, '125000.00');
  assert.equal(response.body[0].password_hash, undefined);
});

test('manager access is team-scoped and excludes salary and project budgets', async () => {
  const usersResponse = await request('/users', { 'x-tenant-id': '1', 'x-user-id': '2' });
  assert.equal(usersResponse.status, 200);
  assert.deepEqual(usersResponse.body.map((user) => user.id), [1, 2]);
  assert.equal(usersResponse.body[0].salary, undefined);

  const projectsResponse = await request('/projects', { 'x-tenant-id': '1', 'x-user-id': '2' });
  assert.equal(projectsResponse.status, 200);
  assert.deepEqual(projectsResponse.body.map((project) => project.id), [1]);
  assert.equal(projectsResponse.body[0].budget, undefined);
});

test('user access is limited to self and assigned projects', async () => {
  const usersResponse = await request('/users/3', { 'x-tenant-id': '2', 'x-user-id': '4' });
  assert.equal(usersResponse.status, 200);
  assert.equal(usersResponse.body.id, 4);
  assert.equal(usersResponse.body.salary, undefined);

  const projectsResponse = await request('/projects', { 'x-tenant-id': '2', 'x-user-id': '4' });
  assert.equal(projectsResponse.status, 200);
  assert.deepEqual(projectsResponse.body.map((project) => project.id), [2]);
});

test('a user cannot authenticate through another tenant', async () => {
  const response = await request('/users', { 'x-tenant-id': '1', 'x-user-id': '4' });
  assert.equal(response.status, 403);
});

test('database access paths contain explicit tenant boundaries', async () => {
  await request('/users', { 'x-tenant-id': '1', 'x-user-id': '1' });
  await request('/projects', { 'x-tenant-id': '1', 'x-user-id': '1' });
  assert.ok(queries.length >= 4);
  assert.ok(queries.every(({ text }) => text.includes('tenant_id')));
  assert.ok(queries.every(({ text }) => !text.includes('SELECT *')));
});
