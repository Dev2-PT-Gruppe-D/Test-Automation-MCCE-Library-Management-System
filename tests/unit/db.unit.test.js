process.env.NODE_ENV = 'test'; // selects the in-memory database in src/db.js

const { db, initDb, clearAllTables } = require('../../src/db');

const insertBook = (cols, vals) =>
  db.prepare(`INSERT INTO books (${cols}) VALUES (${vals.map(() => '?').join(', ')})`).run(...vals);

const fullBook = (isbn, title = 'A Title', author = 'A. Uthor', year = 2000) =>
  insertBook('isbn, title, author, year', [isbn, title, author, year]);

beforeAll(async () => { await initDb(); });
beforeEach(() => { clearAllTables(); });

describe('books schema — required fields (R1, R3)', () => {
  it('UT-DB-01: inserts a valid book and returns the new id', () => {
    const r = fullBook('9780000000001', 'Inserted');
    expect(r.lastInsertRowid).toBeTypeOf('number');
    expect(db.prepare('SELECT * FROM books WHERE id = ?').get(r.lastInsertRowid).title).toBe('Inserted');
  });

  it('UT-DB-02: rejects a NULL title (title is mandatory)', () => {
    expect(() => insertBook('isbn, title, author, year', ['9780000000002', null, 'A', 2000]))
      .toThrow(/NOT NULL/i);
  });

  it('UT-DB-03: rejects a NULL author (author is mandatory)', () => {
    expect(() => insertBook('isbn, title, author, year', ['9780000000003', 'T', null, 2000]))
      .toThrow(/NOT NULL/i);
  });

  it('UT-DB-04: rejects a NULL isbn (isbn is mandatory)', () => {
    expect(() => insertBook('isbn, title, author, year', [null, 'T', 'A', 2000]))
      .toThrow(/NOT NULL/i);
  });
});

describe('books schema — uniqueness & defaults (R2, R6)', () => {
  it('UT-DB-05: enforces the UNIQUE isbn constraint', () => {
    fullBook('9780000000005', 'First');
    expect(() => fullBook('9780000000005', 'Duplicate')).toThrow(/UNIQUE/i);
  });

  it('UT-DB-06: applies column defaults (genre, totalCopies, availableCopies)', () => {
    const r = fullBook('9780000000006', 'Defaults');
    const row = db.prepare('SELECT * FROM books WHERE id = ?').get(r.lastInsertRowid);
    expect(row.genre).toBe('');
    expect(row.totalCopies).toBe(1);
    expect(row.availableCopies).toBe(1);
  });

  it('UT-DB-07: stores an explicit availableCopies below totalCopies (post-loan state)', () => {
    const r = insertBook('isbn, title, author, year, totalCopies, availableCopies',
      ['9780000000007', 'Borrowed', 'A', 2000, 3, 1]);
    const row = db.prepare('SELECT * FROM books WHERE id = ?').get(r.lastInsertRowid);
    expect(row.totalCopies).toBe(3);
    expect(row.availableCopies).toBe(1);
  });
});

describe('books data layer — query wrapper', () => {
  it('UT-DB-08: safely escapes single quotes in bound parameters', () => {
    const r = fullBook('9780000000008', "O'Brien & Sons");
    expect(db.prepare('SELECT * FROM books WHERE id = ?').get(r.lastInsertRowid).title)
      .toBe("O'Brien & Sons"); // no SQL breakage / injection
  });

  it('UT-DB-09: all() returns an array of row objects, ordered', () => {
    fullBook('9780000000009', 'B1');
    fullBook('9780000000010', 'B2');
    const rows = db.prepare('SELECT * FROM books ORDER BY title').all();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(2);
    expect(rows[0].title).toBe('B1');
  });

  it('UT-DB-10: get() returns null when nothing matches', () => {
    expect(db.prepare('SELECT * FROM books WHERE id = ?').get(99999)).toBeNull();
  });
});

describe('books data layer — identity & isolation support', () => {
  it('UT-DB-11: id auto-increments across inserts', () => {
    const a = fullBook('9780000000011', 'A');
    const b = fullBook('9780000000012', 'B');
    expect(b.lastInsertRowid).toBe(a.lastInsertRowid + 1);
  });

  it('UT-DB-12: clearAllTables() empties the table and resets the id sequence', () => {
    fullBook('9780000000013', 'Temp');
    clearAllTables();
    expect(db.prepare('SELECT COUNT(*) as n FROM books').get().n).toBe(0);
    const fresh = fullBook('9780000000014', 'Fresh');
    expect(fresh.lastInsertRowid).toBe(1); // sequence restarted
  });
});
