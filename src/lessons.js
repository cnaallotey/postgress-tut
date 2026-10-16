// lessons.js — a guided tour of Postgres. Run `npm run lessons` and read along.
// Each lesson prints the SQL it runs and the result.
import { pool, query } from './db.js';

async function show(title, sql, params = []) {
  console.log(`\n=== ${title} ===`);
  console.log(sql.trim().replace(/^\s+/gm, '  '));
  if (params.length) console.log('  params:', params);
  const res = await query(sql, params);
  if (res.rows.length) console.table(res.rows);
  else console.log(`  -> ${res.command}, ${res.rowCount} row(s) affected`);
  return res;
}

// 1. SELECT: read rows. * means "all columns".
await show('1. Read everything', 'SELECT * FROM authors');

// 2. WHERE / ORDER BY / LIMIT: filter, sort, and cap results.
await show(
  '2. Filter + sort + limit',
  'SELECT title, year FROM books WHERE year < 1980 ORDER BY year DESC LIMIT 3',
);

// 3. Parameters ($1, $2...): ALWAYS pass user input this way, never by
//    gluing strings together. It prevents SQL injection.
await show('3. Parameterised query', 'SELECT title, price FROM books WHERE price < $1', [13]);

// 4. NULL is "unknown", not "empty". You must use IS NULL, not = NULL.
await show('4. NULL handling', 'SELECT name FROM authors WHERE country IS NULL');

// 5. JOIN: combine rows from two tables using the foreign key.
await show(
  '5. JOIN books with their authors',
  `SELECT b.title, a.name AS author
     FROM books b
     JOIN authors a ON a.id = b.author_id
    ORDER BY a.name`,
);

// 6. GROUP BY + aggregates: COUNT, SUM, AVG summarise many rows into one.
await show(
  '6. Aggregates per author',
  `SELECT a.name,
          COUNT(b.id)          AS books,
          SUM(b.copies)        AS copies_in_stock,
          ROUND(AVG(b.price), 2) AS avg_price
     FROM authors a
     LEFT JOIN books b ON b.author_id = a.id
    GROUP BY a.name
    ORDER BY books DESC`,
);

// 7. Arrays: a Postgres-specific feature. ANY() checks membership.
await show('7. Array column', "SELECT title, tags FROM books WHERE 'classic' = ANY(tags)");

// 8. INSERT ... RETURNING: get the new row back (including its generated id).
await show(
  '8. Insert and get the row back',
  'INSERT INTO books (title, year, price, copies, author_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
  ['The Dispossessed', 1974, 10.5, 3, 4],
);

// 9. UPDATE: change existing rows. Forgetting WHERE updates EVERY row!
await show('9. Update', 'UPDATE books SET price = price * 0.9 WHERE year < 1970 RETURNING title, price');

// 10. Constraints: Postgres enforces your rules. Watch these fail on purpose.
console.log('\n=== 10. Constraints protect your data ===');
const badQueries = [
  ['negative copies (CHECK)', 'UPDATE books SET copies = -1 WHERE id = 1'],
  ['author 999 does not exist (FOREIGN KEY)', "INSERT INTO books (title, author_id) VALUES ('Ghost', 999)"],
  ['duplicate title for same author (UNIQUE)', "INSERT INTO books (title, author_id) VALUES ('Arrow of God', 1)"],
  ['missing title (NOT NULL)', 'INSERT INTO books (author_id) VALUES (1)'],
];
for (const [label, sql] of badQueries) {
  try {
    await query(sql);
  } catch (err) {
    console.log(`  ✗ ${label}\n      Postgres says: ${err.message} (code ${err.code})`);
  }
}

// 11. Transactions: several statements that succeed or fail TOGETHER.
//     Here we "sell" a book: reduce stock and... then something goes wrong.
//     ROLLBACK undoes everything since BEGIN, so the stock is untouched.
console.log('\n=== 11. Transactions (BEGIN / COMMIT / ROLLBACK) ===');
const client = await pool.connect(); // a transaction must use ONE connection
try {
  const before = await client.query('SELECT copies FROM books WHERE id = 1');
  console.log('  copies before:', before.rows[0].copies);
  await client.query('BEGIN');
  await client.query('UPDATE books SET copies = copies - 1 WHERE id = 1');
  const during = await client.query('SELECT copies FROM books WHERE id = 1');
  console.log('  copies inside transaction:', during.rows[0].copies);
  throw new Error('payment failed!'); // simulate a problem
} catch (err) {
  await client.query('ROLLBACK');
  console.log(`  ${err.message} -> ROLLBACK`);
} finally {
  const after = await client.query('SELECT copies FROM books WHERE id = 1');
  console.log('  copies after rollback:', after.rows[0].copies, '(unchanged)');
  client.release();
}

// 12. EXPLAIN: ask Postgres HOW it will run a query. Useful for speed problems.
await show('12. EXPLAIN (query plan)', 'EXPLAIN SELECT * FROM books WHERE author_id = 1');

// 13. DELETE with CASCADE: removing an author removes their books too.
await show('13. Delete (cascades to books)', 'DELETE FROM authors WHERE id = 4 RETURNING name');
await show('    ...their books are gone', 'SELECT COUNT(*) AS books_by_author_4 FROM books WHERE author_id = 4');

console.log('\nDone! Run `npm run setup` to reset the data, then try your own queries.');
await pool.end();
