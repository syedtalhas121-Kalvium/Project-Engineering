require('dotenv').config();

const { Pool } = require('pg');

const primaryConnectionString =
  process.env.PRIMARY_DB_URL || process.env.DATABASE_URL;
const replicaConnectionString =
  process.env.REPLICA_DB_URL || primaryConnectionString;

if (!primaryConnectionString) {
  throw new Error('PRIMARY_DB_URL (or legacy DATABASE_URL) must be configured');
}

/**
 * Writes always use the primary. Read-only queries use the replica when one is
 * configured; pointing both variables at the same database is supported for
 * local development and the deployed demo.
 */
const primaryPool = new Pool({
  connectionString: primaryConnectionString,
});

const replicaPool =
  replicaConnectionString === primaryConnectionString
    ? primaryPool
    : new Pool({ connectionString: replicaConnectionString });

const writeQuery = (text, params) => primaryPool.query(text, params);
const readQuery = (text, params) => replicaPool.query(text, params);

module.exports = {
  // `query` remains as a backwards-compatible write alias for callers outside
  // this challenge; routes use readQuery/writeQuery explicitly.
  query: writeQuery,
  readQuery,
  writeQuery,
  pool: primaryPool,
  primaryPool,
  replicaPool,
};
