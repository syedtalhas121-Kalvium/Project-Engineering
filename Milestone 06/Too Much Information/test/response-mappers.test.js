import test from 'node:test';
import assert from 'node:assert/strict';
import { toAuthUser, toProfileUser } from '../response-mappers.js';

const databaseUser = {
  id: 7,
  name: 'Corporate Admin',
  email: 'admin@corpauth.dev',
  password_hash: '$2a$10$secret-hash',
  role: 'admin',
  is_admin: true,
  stripe_customer_id: 'cus_ADMIN_99_PRO_SECURE',
  verification_token: 'verification-secret',
  reset_password_token: 'reset-secret',
  last_login_ip: '192.168.1.1',
  subscription_plan: 'enterprise',
  feature_flags: { unlimited_api: true },
  salary: 150000,
  created_at: '2026-08-20T00:00:00.000Z',
  updated_at: '2026-08-20T00:00:00.000Z'
};

const sensitiveKeys = [
  'password_hash',
  'is_admin',
  'stripe_customer_id',
  'verification_token',
  'reset_password_token',
  'last_login_ip',
  'feature_flags',
  'salary',
  'updated_at'
];

test('toAuthUser returns only the minimum auth identity', () => {
  assert.deepEqual(toAuthUser(databaseUser), {
    id: 7,
    name: 'Corporate Admin',
    email: 'admin@corpauth.dev',
    role: 'admin',
    createdAt: '2026-08-20T00:00:00.000Z'
  });

  for (const key of sensitiveKeys) {
    assert.equal(Object.hasOwn(toAuthUser(databaseUser), key), false, `${key} must not be exposed`);
  }
});

test('toProfileUser adds only the approved subscription context', () => {
  assert.deepEqual(toProfileUser(databaseUser), {
    id: 7,
    name: 'Corporate Admin',
    email: 'admin@corpauth.dev',
    role: 'admin',
    createdAt: '2026-08-20T00:00:00.000Z',
    subscriptionPlan: 'enterprise'
  });

  for (const key of sensitiveKeys) {
    assert.equal(Object.hasOwn(toProfileUser(databaseUser), key), false, `${key} must not be exposed`);
  }
});
