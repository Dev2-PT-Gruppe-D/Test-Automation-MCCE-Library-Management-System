const api = require('./client');

// ── unique value generators ───────────────────────────────────────────────────

let seq = 0;
function nextSeq() {
  return ++seq;
}

/** A unique, valid 13-digit ISBN */
function uniqueIsbn() {
  const base = (Date.now() % 1e7).toString().padStart(7, '0'); // 7 digits
  const s = String(nextSeq() % 1000).padStart(3, '0');         // 3 digits
  const rnd = String(Math.floor(Math.random() * 1000)).padStart(3, '0'); // 3 digits
  return (base + s + rnd).slice(0, 13);
}

/** A unique, valid 10-character ISBN */
function uniqueIsbn10(checkDigit) {
  const nine = uniqueIsbn().slice(0, 9); // 9 unique digits
  return nine + (checkDigit ?? '7');     // append a digit (or 'X' if passed)
}

/** A unique, valid email address. */
function uniqueEmail(prefix = 'member') {
  return `${prefix}_${Date.now().toString(36)}_${nextSeq()}@example.com`;
}

// ── plain bodies (no HTTP) — handy for negative/validation tests ───────────────

function bookBody(overrides = {}) {
  return {
    isbn: uniqueIsbn(),
    title: `Test Book ${nextSeq()}`,
    author: 'Test Author',
    genre: 'Testing',
    year: 2020,
    totalCopies: 1,
    ...overrides
  };
}

function memberBody(overrides = {}) {
  return {
    name: `Test Member ${nextSeq()}`,
    email: uniqueEmail(),
    ...overrides
  };
}

// ── creators (HTTP) — assert success and return the created entity ─────────────

async function createBook(overrides = {}) {
  const res = await api.post('/api/books', bookBody(overrides));
  if (res.status !== 201) {
    throw new Error(`createBook expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function createMember(overrides = {}) {
  const res = await api.post('/api/members', memberBody(overrides));
  if (res.status !== 201) {
    throw new Error(`createMember expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function createLoan(bookId, memberId) {
  const res = await api.post('/api/loans', { bookId, memberId });
  if (res.status !== 201) {
    throw new Error(`createLoan expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function createReservation(bookId, memberId) {
  const res = await api.post('/api/reservations', { bookId, memberId });
  if (res.status !== 201) {
    throw new Error(`createReservation expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

// ── composite scenarios ───────────────────────────────────────────────────────

async function createUnavailableBook({ copies = 1, bookOverrides = {} } = {}) {
  const book = await createBook({ totalCopies: copies, ...bookOverrides });
  const loans = [];
  const holders = [];
  for (let i = 0; i < copies; i++) {
    const member = await createMember();
    const loan = await createLoan(book.id, member.id);
    holders.push(member);
    loans.push(loan);
  }
  const refreshed = await api.get(`/api/books/${book.id}`);
  return { book: refreshed.body, loans, holders };
}

module.exports = {
  nextSeq,
  uniqueIsbn,
  uniqueIsbn10,
  uniqueEmail,
  bookBody,
  memberBody,
  createBook,
  createMember,
  createLoan,
  createReservation,
  createUnavailableBook
};
