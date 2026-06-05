const api = require('../../helpers/client');
const { createBook, uniqueIsbn } = require('../../helpers/factories');

const currentYear = new Date().getFullYear();

describe('PUT /api/books/:id — update (positive)', () => {
  it('TC-G1-027: updates title, author, genre and year', async () => {
    const book = await createBook({ title: 'Old', author: 'Old A', genre: 'Old G', year: 1990 });
    const res = await api.put(`/api/books/${book.id}`, {
      title: 'New Title', author: 'New Author', genre: 'New Genre', year: 2001
    });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New Title');
    expect(res.body.author).toBe('New Author');
    expect(res.body.genre).toBe('New Genre');
    expect(res.body.year).toBe(2001);
  });

  it('TC-G1-028: increasing totalCopies raises availableCopies by the same delta', async () => {
    const book = await createBook({ totalCopies: 2 });
    const res = await api.put(`/api/books/${book.id}`, { totalCopies: 5 });
    expect(res.status).toBe(200);
    expect(res.body.totalCopies).toBe(5);
    expect(res.body.availableCopies).toBe(5);
  });

  it('TC-G1-029: decreasing totalCopies lowers availableCopies but never below 0', async () => {
    const book = await createBook({ totalCopies: 3 });
    const res = await api.put(`/api/books/${book.id}`, { totalCopies: 1 });
    expect(res.status).toBe(200);
    expect(res.body.totalCopies).toBe(1);
    expect(res.body.availableCopies).toBe(1);
    expect(res.body.availableCopies).toBeGreaterThanOrEqual(0);
  });

  it('TC-G1-030: keeps the ISBN immutable even if a new one is supplied', async () => {
    const book = await createBook();
    const res = await api.put(`/api/books/${book.id}`, { isbn: uniqueIsbn(), title: 'Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.isbn).toBe(book.isbn);
    expect(res.body.title).toBe('Renamed');
  });
});

describe('PUT /api/books/:id — validation', () => {
  it('TC-G1-031: rejects a future year with 400', async () => {
    const book = await createBook();
    const res = await api.put(`/api/books/${book.id}`, { year: currentYear + 1 });
    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/year/i);
  });

  it('TC-G1-032: rejects totalCopies = 0 with 400', async () => {
    const book = await createBook();
    const res = await api.put(`/api/books/${book.id}`, { totalCopies: 0 });
    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/copies/i);
  });

  it('TC-G1-046: rejects clearing the title to a blank value with 400', async () => {
    const book = await createBook({ title: 'Has A Title' });
    const res = await api.put(`/api/books/${book.id}`, { title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/title/i);
  });
});

describe('PUT /api/books/:id — not found', () => {
  it('TC-G1-033: returns 404 for a non-existent id', async () => {
    const res = await api.put('/api/books/99999999', { title: 'Nope' });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
