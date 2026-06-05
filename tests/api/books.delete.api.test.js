const api = require('../../helpers/client');
const { createBook, createMember, createLoan } = require('../../helpers/factories');

describe('DELETE /api/books/:id', () => {
  it('TC-G1-034: deletes an existing book and returns 204', async () => {
    const book = await createBook();
    const res = await api.del(`/api/books/${book.id}`);
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();

    const after = await api.get(`/api/books/${book.id}`);
    expect(after.status).toBe(404);
  });

  it('TC-G1-035: returns 404 when deleting a non-existent book', async () => {
    const res = await api.del('/api/books/99999999');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('TC-G1-036: refuses to delete a book that has an active loan (409)', async () => {
    const book = await createBook({ totalCopies: 1 });
    const member = await createMember();
    await createLoan(book.id, member.id);

    const res = await api.del(`/api/books/${book.id}`);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/active loan/i);

    const stillThere = await api.get(`/api/books/${book.id}`);
    expect(stillThere.status).toBe(200);
  });
});
