-- schema.sql — the shape of our data.
-- Run by `npm run setup`. It drops and recreates everything, so it's safe to re-run.

DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;

-- A table is like a spreadsheet with strict column types.
CREATE TABLE authors (
  id         SERIAL PRIMARY KEY,          -- auto-incrementing unique id (1, 2, 3...)
  name       TEXT NOT NULL,               -- NOT NULL = this column must have a value
  country    TEXT,                        -- nullable: may be empty (NULL)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()  -- filled in automatically
);

CREATE TABLE books (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  year         INTEGER CHECK (year > 0),  -- CHECK = Postgres rejects bad values
  price        NUMERIC(8, 2) NOT NULL DEFAULT 0,  -- exact decimal, good for money
  copies       INTEGER NOT NULL DEFAULT 0 CHECK (copies >= 0),
  tags         TEXT[] NOT NULL DEFAULT '{}',      -- an array column (Postgres feature)
  -- FOREIGN KEY: every book must point to a real author.
  -- ON DELETE CASCADE: deleting an author deletes their books too.
  author_id    INTEGER NOT NULL REFERENCES authors(id) ON DELETE CASCADE,
  UNIQUE (author_id, title)               -- same author can't have two books with one title
);

-- An index makes lookups on a column fast (like a book's index).
-- Postgres automatically indexes PRIMARY KEY and UNIQUE columns, but not
-- foreign keys, so we add one for author_id because we join on it a lot.
CREATE INDEX books_author_id_idx ON books(author_id);
