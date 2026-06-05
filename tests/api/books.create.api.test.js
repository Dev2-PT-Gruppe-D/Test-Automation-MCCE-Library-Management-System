const api = require('../../helpers/client');
const { bookBody, uniqueIsbn, uniqueIsbn10 } = require('../../helpers/factories');

const currentYear = new Date().getFullYear();

describe('POST /api/books — creation (positive)', () => {
  it('TC-G1-001: creates a book and returns 201 with the persisted entity', async () => {
    const body = bookBody({ title: 'Watership Down', author: 'Richard Adams', year: 1972, totalCopies: 3 });
    const res = await api.post('/api/books', body);

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf('number');
    expect(res.body.isbn).toBe(body.isbn);
    expect(res.body.title).toBe('Watership Down');
    expect(res.body.author).toBe('Richard Adams');
    expect(res.body.year).toBe(1972);
    expect(res.body.totalCopies).toBe(3);
  });

  it('TC-G1-002: initialises availableCopies equal to totalCopies', async () => {
    const res = await api.post('/api/books', bookBody({ totalCopies: 5 }));
    expect(res.status).toBe(201);
    expect(res.body.availableCopies).toBe(5);
    expect(res.body.availableCopies).toBe(res.body.totalCopies);
  });

  it('TC-G1-003: defaults totalCopies to 1 when omitted', async () => {
    const { isbn } = bookBody();
    const res = await api.post('/api/books', { isbn, title: 'Defaulted', author: 'A. Uthor', year: 2000 });
    expect(res.status).toBe(201);
    expect(res.body.totalCopies).toBe(1);
    expect(res.body.availableCopies).toBe(1);
  });

  it('TC-G1-004: defaults genre to an empty string when omitted', async () => {
    const { isbn } = bookBody();
    const res = await api.post('/api/books', { isbn, title: 'No Genre', author: 'A. Uthor', year: 2000 });
    expect(res.status).toBe(201);
    expect(res.body.genre).toBe('');
  });

  it('TC-G1-005: trims surrounding whitespace from title and author', async () => {
    const res = await api.post('/api/books', bookBody({ title: '  Spaced Out  ', author: '  Jane Doe  ' }));
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Spaced Out');
    expect(res.body.author).toBe('Jane Doe');
  });
});

describe('POST /api/books — ISBN validation', () => {
  // Valid - all must be accepted with 201
  it.each([
    { tc: 'TC-G1-006', kind: 'a valid 13-digit ISBN', make: () => uniqueIsbn() },
    { tc: 'TC-G1-007', kind: 'a valid 10-digit ISBN', make: () => uniqueIsbn10() },
    { tc: 'TC-G1-008', kind: 'a 10-character ISBN ending in X', make: () => uniqueIsbn10('X') }
  ])('$tc: accepts $kind', async ({ make }) => {
    const res = await api.post('/api/books', bookBody({ isbn: make() }));
    expect(res.status).toBe(201);
  });

  // Invalid — all must be rejected with 400 and an isbn message.
  it.each([
    { tc: 'TC-G1-009', kind: 'an 11-digit ISBN', isbn: '12345678901' },
    { tc: 'TC-G1-010', kind: 'an ISBN containing letters', isbn: '97814032872A' },
    { tc: 'TC-G1-011', kind: 'a missing ISBN', isbn: undefined }
  ])('$tc: rejects $kind with 400', async ({ isbn }) => {
    const body = bookBody();
    if (isbn === undefined) delete body.isbn; else body.isbn = isbn;
    const res = await api.post('/api/books', body);
    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(/isbn/i);
  });
});

describe('POST /api/books — required fields', () => {
  it.each([
    { tc: 'TC-G1-012', what: 'a missing title', mutate: (b) => { delete b.title; }, match: /title/i },
    { tc: 'TC-G1-013', what: 'a blank (whitespace-only) title', mutate: (b) => { b.title = '   '; }, match: /title/i },
    { tc: 'TC-G1-014', what: 'a missing author', mutate: (b) => { delete b.author; }, match: /author/i }
  ])('$tc: rejects $what with 400', async ({ mutate, match }) => {
    const body = bookBody();
    mutate(body);
    const res = await api.post('/api/books', body);
    expect(res.status).toBe(400);
    expect(res.body.errors.join(' ')).toMatch(match);
  });
});

describe('POST /api/books — year validation', () => {
  it.each([
    { tc: 'TC-G1-015', desc: '1000 (lower boundary)', year: 1000, status: 201 },
    { tc: 'TC-G1-016', desc: '999 (below lower boundary)', year: 999, status: 400 },
    { tc: 'TC-G1-017', desc: 'the current year (upper boundary)', year: currentYear, status: 201 },
    { tc: 'TC-G1-018', desc: 'next year (future)', year: currentYear + 1, status: 400 }
  ])('$tc: year $desc → $status', async ({ year, status }) => {
    const res = await api.post('/api/books', bookBody({ year }));
    expect(res.status).toBe(status);
    if (status === 400) expect(res.body.errors.join(' ')).toMatch(/year/i);
  });
});

describe('POST /api/books — totalCopies validation', () => {
  it.each([
    { tc: 'TC-G1-019', desc: '1 (lower boundary)', copies: 1, status: 201 },
    { tc: 'TC-G1-020', desc: '0 (below boundary)', copies: 0, status: 400 },
    { tc: 'TC-G1-021', desc: 'a negative value', copies: -3, status: 400 }
  ])('$tc: totalCopies $desc → $status', async ({ copies, status }) => {
    const res = await api.post('/api/books', bookBody({ totalCopies: copies }));
    expect(res.status).toBe(status);
    if (status === 201) expect(res.body.totalCopies).toBe(copies);
    if (status === 400) expect(res.body.errors.join(' ')).toMatch(/copies/i);
  });
});

describe('POST /api/books — uniqueness', () => {
  it('TC-G1-022: rejects a duplicate ISBN with 409', async () => {
    const isbn = uniqueIsbn();
    const first = await api.post('/api/books', bookBody({ isbn }));
    expect(first.status).toBe(201);

    const dup = await api.post('/api/books', bookBody({ isbn }));
    expect(dup.status).toBe(409);
    expect(dup.body.error).toMatch(/isbn/i);
  });
});
