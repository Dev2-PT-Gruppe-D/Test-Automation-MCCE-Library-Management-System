const api = require('../../helpers/client');
const { createBook } = require('../../helpers/factories');

describe('GET /api/books — list', () => {
  it('TC-G1-023: returns 200 and an array', async () => {
    const res = await api.get('/api/books');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('TC-G1-024: includes a freshly created book in the list', async () => {
    const book = await createBook({ title: 'Findable Title' });
    const res = await api.get('/api/books');
    const found = res.body.find(b => b.id === book.id);
    expect(found).toBeDefined();
    expect(found.title).toBe('Findable Title');
  });
});

describe('GET /api/books/:id — single', () => {
  it('TC-G1-025: returns 200 and the matching book', async () => {
    const book = await createBook();
    const res = await api.get(`/api/books/${book.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(book.id);
    expect(res.body.isbn).toBe(book.isbn);
  });

  it('TC-G1-026: returns 404 for a non-existent id', async () => {
    const res = await api.get('/api/books/99999999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
