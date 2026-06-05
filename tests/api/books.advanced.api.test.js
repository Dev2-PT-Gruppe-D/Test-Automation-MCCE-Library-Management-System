const api = require('../../helpers/client');
const {
  createBook, createMember, createLoan, uniqueIsbn, bookBody
} = require('../../helpers/factories');

describe('GET /api/books — ordering', () => {
  it('TC-G1-037: returns books ordered by title (A before Z)', async () => {
    const tag = Date.now();
    await createBook({ title: `ZZZ-${tag}` });
    await createBook({ title: `AAA-${tag}` });

    const res = await api.get('/api/books');
    const titles = res.body.map(b => b.title);
    const idxA = titles.indexOf(`AAA-${tag}`);
    const idxZ = titles.indexOf(`ZZZ-${tag}`);
    expect(idxA).toBeGreaterThanOrEqual(0);
    expect(idxZ).toBeGreaterThanOrEqual(0);
    expect(idxA).toBeLessThan(idxZ);
  });
});

describe('POST /api/books — further validation partitions', () => {
  it('TC-G1-038: rejects a non-numeric year', async () => {
    const res = await api.post('/api/books', bookBody({ year: 'abcd' }));
    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/year/i);
  });

  it('TC-G1-039: rejects a 9-digit ISBN (just below the 10-char branch)', async () => {
    const res = await api.post('/api/books', bookBody({ isbn: '123456789' }));
    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/isbn/i);
  });

  it('TC-G1-040: rejects a 12-digit ISBN (between the 10- and 13-char branches)', async () => {
    const res = await api.post('/api/books', bookBody({ isbn: '123456789012' }));
    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/isbn/i);
  });

  it('TC-G1-041: accepts a large totalCopies value', async () => {
    const res = await api.post('/api/books', bookBody({ totalCopies: 999 }));
    expect(res.status).toBe(201);
    expect(res.body.totalCopies).toBe(999);
    expect(res.body.availableCopies).toBe(999);
  });
});

describe('PUT /api/books/:id — partial updates & side-effects', () => {
  it('TC-G1-042: a partial update changes only the supplied field', async () => {
    const book = await createBook({ title: 'Keep Title', author: 'Keep Author', genre: 'Old', year: 1995 });
    const res = await api.put(`/api/books/${book.id}`, { genre: 'New Genre' });
    expect(res.status).toBe(200);
    expect(res.body.genre).toBe('New Genre');
    // untouched fields are preserved
    expect(res.body.title).toBe('Keep Title');
    expect(res.body.author).toBe('Keep Author');
    expect(res.body.year).toBe(1995);
  });

  it('TC-G1-043: updating metadata without totalCopies leaves availableCopies untouched', async () => {
    const book = await createBook({ totalCopies: 2 });
    const member = await createMember();
    await createLoan(book.id, member.id);

    const res = await api.put(`/api/books/${book.id}`, { title: 'Renamed Only' });
    expect(res.status).toBe(200);
    expect(res.body.totalCopies).toBe(2);
    expect(res.body.availableCopies).toBe(1);
  });
});

describe('DELETE /api/books/:id — returned loans do not block deletion', () => {
  it('TC-G1-044: deletes a book whose only loan has been returned', async () => {
    const book = await createBook({ totalCopies: 1 });
    const member = await createMember();
    const loan = await createLoan(book.id, member.id);

    const ret = await api.post(`/api/loans/${loan.id}/return`);
    expect(ret.status).toBe(200);

    const del = await api.del(`/api/books/${book.id}`);
    expect(del.status).toBe(204);

    const after = await api.get(`/api/books/${book.id}`);
    expect(after.status).toBe(404);
  });
});

describe('GET /api/books/:id — malformed id', () => {
  it('TC-G1-045: returns 404 for a non-numeric id', async () => {
    const res = await api.get('/api/books/not-a-number');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
