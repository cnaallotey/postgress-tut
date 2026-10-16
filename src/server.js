// server.js — a small REST API showing how a real app talks to Postgres.
import express from 'express';
import { query } from './db.js';

const app = express();
app.use(express.json());

// List books with author name. Optional ?search= filter (case-insensitive).
app.get('/books', async (req, res) => {
  const search = req.query.search ?? '';
  const { rows } = await query(
    `SELECT b.id, b.title, b.year, b.price, b.copies, b.tags, a.name AS author
       FROM books b
       JOIN authors a ON a.id = b.author_id
      WHERE b.title ILIKE $1          -- ILIKE = case-insensitive pattern match
      ORDER BY b.title`,
    [`%${search}%`],
  );
  res.json(rows);
});

app.get('/books/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM books WHERE id = $1', [req.params.id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Book not found' });
  res.json(rows[0]);
});

app.post('/books', async (req, res) => {
  const { title, year, price = 0, copies = 0, tags = [], author_id } = req.body;
  const { rows } = await query(
    `INSERT INTO books (title, year, price, copies, tags, author_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [title, year, price, copies, tags, author_id],
  );
  res.status(201).json(rows[0]);
});

// COALESCE($1, title) means "use the new value if given, otherwise keep the old one".
app.patch('/books/:id', async (req, res) => {
  const { title, year, price, copies } = req.body;
  const { rows } = await query(
    `UPDATE books
        SET title  = COALESCE($1, title),
            year   = COALESCE($2, year),
            price  = COALESCE($3, price),
            copies = COALESCE($4, copies)
      WHERE id = $5
      RETURNING *`,
    [title, year, price, copies, req.params.id],
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Book not found' });
  res.json(rows[0]);
});

app.delete('/books/:id', async (req, res) => {
  const { rowCount } = await query('DELETE FROM books WHERE id = $1', [req.params.id]);
  if (rowCount === 0) return res.status(404).json({ error: 'Book not found' });
  res.status(204).end();
});

// Authors with a count of their books (LEFT JOIN keeps authors with zero books).
app.get('/authors', async (_req, res) => {
  const { rows } = await query(
    `SELECT a.id, a.name, a.country, COUNT(b.id)::int AS book_count
       FROM authors a
       LEFT JOIN books b ON b.author_id = a.id
      GROUP BY a.id
      ORDER BY a.name`,
  );
  res.json(rows);
});

app.post('/authors', async (req, res) => {
  const { name, country } = req.body;
  const { rows } = await query(
    'INSERT INTO authors (name, country) VALUES ($1, $2) RETURNING *',
    [name, country ?? null],
  );
  res.status(201).json(rows[0]);
});

// Turn Postgres errors into friendly HTTP errors. Each error has a `code`:
// https://www.postgresql.org/docs/current/errcodes-appendix.html
app.use((err, _req, res, _next) => {
  const known = {
    '23502': [400, 'A required field is missing'],     // not_null_violation
    '23503': [400, 'Referenced author does not exist'], // foreign_key_violation
    '23505': [409, 'That record already exists'],       // unique_violation
    '23514': [400, 'A value broke a CHECK rule'],       // check_violation
    '22P02': [400, 'Invalid input format'],             // e.g. "abc" as an id
  };
  const [status, message] = known[err.code] ?? [500, 'Something went wrong'];
  if (status === 500) console.error(err);
  res.status(status).json({ error: message, detail: err.detail ?? err.message });
});

const port = process.env.PORT ?? 3000;
app.listen(port, () => console.log(`API running at http://localhost:${port}`));
