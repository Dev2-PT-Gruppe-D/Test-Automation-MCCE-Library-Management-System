const api = require('../../helpers/client');
const { createBook, createMember, createLoan } = require('../../helpers/factories');

describe('Integration — catalog <-> loans <-> availability', () => {
  it('IT-G1-01: borrow drops availability & blocks delete; return restores & allows delete', async () => {
    const book = await createBook({ totalCopies: 1 });
    const member = await createMember();

    // Borrow -> availableCopies decremented to 0
    const loan = await createLoan(book.id, member.id);
    expect((await api.get(`/api/books/${book.id}`)).body.availableCopies).toBe(0);

    // Delete guard: a book with an active loan cannot be deleted
    expect((await api.del(`/api/books/${book.id}`)).status).toBe(409);

    // Return -> availability restored to 1
    expect((await api.post(`/api/loans/${loan.id}/return`)).status).toBe(200);
    expect((await api.get(`/api/books/${book.id}`)).body.availableCopies).toBe(1);

    // With no active loan, the book is now deletable
    expect((await api.del(`/api/books/${book.id}`)).status).toBe(204);
    expect((await api.get(`/api/books/${book.id}`)).status).toBe(404);
  });

  it('IT-G1-02: a catalog copy-count increase makes a previously unavailable book borrowable', async () => {
    const book = await createBook({ totalCopies: 1 });
    const m1 = await createMember();
    await createLoan(book.id, m1.id); // last copy taken -> availableCopies 0

    // A second member cannot borrow while no copies are available
    const m2 = await createMember();
    let borrow = await api.post('/api/loans', { bookId: book.id, memberId: m2.id });
    expect(borrow.status).toBe(409);

    // Catalog update raises totalCopies -> availableCopies rises by the same delta
    const upd = await api.put(`/api/books/${book.id}`, { totalCopies: 2 });
    expect(upd.status).toBe(200);
    expect(upd.body.availableCopies).toBe(1);

    // Now the second borrow succeeds
    borrow = await api.post('/api/loans', { bookId: book.id, memberId: m2.id });
    expect(borrow.status).toBe(201);
  });
});
