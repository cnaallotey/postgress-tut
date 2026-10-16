// setup.js — creates the database (if needed), the tables, and some sample data.
import fs from 'node:fs';
import pg from 'pg';

const url = new URL(process.env.DATABASE_URL);
const dbName = url.pathname.slice(1);

// Step 1: connect to the built-in "postgres" database and create ours if missing.
// (You can't create a database while connected to it.)
const adminUrl = new URL(url);
adminUrl.pathname = '/postgres';
const admin = new pg.Client({ connectionString: adminUrl.toString() });
await admin.connect();
const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
if (rowCount === 0) {
  // Identifiers (names) can't be $1 parameters, so we quote it safely instead.
  await admin.query(`CREATE DATABASE ${pg.escapeIdentifier(dbName)}`);
  console.log(`Created database "${dbName}"`);
}
await admin.end();

// Step 2: connect to our database and build the tables.
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const schema = fs.readFileSync(new URL('./schema.sql', import.meta.url), 'utf8');
await client.query(schema);
console.log('Created tables: authors, books');

// Step 3: insert sample data.
// RETURNING gives us back the generated ids so we can link books to authors.
const { rows: authors } = await client.query(`
  INSERT INTO authors (name, country) VALUES
    ('Chinua Achebe', 'Nigeria'),
    ('Ama Ata Aidoo', 'Ghana'),
    ('Haruki Murakami', 'Japan'),
    ('Ursula K. Le Guin', NULL)
  RETURNING id, name
`);
const id = Object.fromEntries(authors.map((a) => [a.name, a.id]));

const books = [
  ['Things Fall Apart', 1958, 12.99, 5, ['classic', 'history'], id['Chinua Achebe']],
  ['Arrow of God', 1964, 14.5, 2, ['classic'], id['Chinua Achebe']],
  ['Our Sister Killjoy', 1977, 11.0, 3, ['classic', 'travel'], id['Ama Ata Aidoo']],
  ['Changes', 1991, 13.25, 0, ['romance'], id['Ama Ata Aidoo']],
  ['Kafka on the Shore', 2002, 16.0, 4, ['fantasy'], id['Haruki Murakami']],
  ['Norwegian Wood', 1987, 15.0, 6, ['romance'], id['Haruki Murakami']],
  ['A Wizard of Earthsea', 1968, 9.99, 7, ['fantasy', 'classic'], id['Ursula K. Le Guin']],
];
for (const b of books) {
  await client.query(
    'INSERT INTO books (title, year, price, copies, tags, author_id) VALUES ($1, $2, $3, $4, $5, $6)',
    b,
  );
}
console.log(`Inserted ${authors.length} authors and ${books.length} books`);
await client.end();
