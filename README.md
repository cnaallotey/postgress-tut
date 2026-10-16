# postgres-tut

A tiny Node.js + PostgreSQL app for learning Postgres. It has a library of **authors** and **books**.

## Setup

1. Copy the env file and put in your Postgres password:
   ```bash
   cp .env.example .env
   ```
   `DATABASE_URL=postgres://postgres:YOUR_PASSWORD@localhost:5432/postgres_tut`
   (This is the password you chose when you installed PostgreSQL.)

2. Install packages, then create the database, tables and sample data:
   ```bash
   npm install
   npm run setup      # safe to re-run: it resets everything
   ```

## Learn

| Command | What it does |
|---|---|
| `npm run lessons` | Runs 13 short lessons and prints each SQL query with its result |
| `npm start` | Starts a REST API on http://localhost:3000 |

Suggested reading order:
1. [src/schema.sql](src/schema.sql): tables, column types, constraints, foreign keys, indexes
2. [src/lessons.js](src/lessons.js): SELECT, WHERE, JOIN, GROUP BY, arrays, INSERT/UPDATE/DELETE, constraints, transactions, EXPLAIN
3. [src/server.js](src/server.js): how a real app uses parameterised queries and handles Postgres errors
4. [src/db.js](src/db.js): connection pooling

## Try the API

```bash
curl "localhost:3000/books?search=wood"
curl localhost:3000/authors
curl -X POST localhost:3000/books -H 'content-type: application/json' \
  -d '{"title":"Anthills of the Savannah","year":1987,"price":13,"author_id":1}'
curl -X PATCH localhost:3000/books/2 -H 'content-type: application/json' -d '{"copies":10}'
curl -X DELETE localhost:3000/books/2
# Watch Postgres reject bad data:
curl -X POST localhost:3000/books -H 'content-type: application/json' -d '{"title":"x","author_id":999}'
```

## Poke at the database directly

```bash
psql -h localhost -U postgres -d postgres_tut
```
Useful commands inside `psql`: `\dt` (list tables), `\d books` (describe a table), `\q` (quit).
Any SQL works there too, e.g. `SELECT * FROM books;` (don't forget the semicolon).

## Things that surprise beginners

- **Numbers that come back as strings.** `NUMERIC` (like `price`) and `COUNT(*)` (a `bigint`) arrive in JS as strings such as `"15.00"`, so precision isn't lost. Cast in SQL (`COUNT(*)::int`) or convert in JS if you need a number.
- **`NULL` isn't equal to anything, not even `NULL`.** Use `IS NULL` / `IS NOT NULL`.
- **Never build SQL with string concatenation.** Use `$1, $2` placeholders to prevent SQL injection.
- **`UPDATE` / `DELETE` without `WHERE`** changes every row in the table.
