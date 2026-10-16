// db.js — one shared connection pool for the whole app.
//
// A "pool" keeps a few open connections to Postgres and hands them out as
// needed. Opening a new connection per query is slow, so apps almost always
// use a pool.
import pg from 'pg';

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Small helper: pool.query(sql, params) borrows a connection, runs the query,
// and gives the connection back automatically.
export function query(sql, params) {
  return pool.query(sql, params);
}
