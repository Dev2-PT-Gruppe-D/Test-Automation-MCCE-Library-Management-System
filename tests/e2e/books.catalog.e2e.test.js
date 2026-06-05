const { test, expect } = require('@playwright/test');
const { uniqueIsbn, uniqueTitle, createBook } = require('../../helpers/factories');

const currentYear = new Date().getFullYear();

test.describe('Books — catalog UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Add Book' })).toBeVisible();
  });

  test('E2E-G1-05: filter the catalog table by title', async ({ page }) => {
    const title = uniqueTitle('E2E Filter');
    await createBook({ title });
    await page.reload();

    const titleFilter = page.getByPlaceholder('Filter…').nth(1);
    await titleFilter.fill(title);

    await expect(page.locator('.dt-count')).toContainText('Showing 1 of');
    await expect(page.locator('tbody').getByRole('cell', { name: title, exact: true })).toBeVisible();
  });

  test('E2E-G1-06: duplicate ISBN shows a conflict error', async ({ page }) => {
    const isbn = uniqueIsbn();
    await createBook({ isbn });
    await page.reload();

    await page.getByPlaceholder('ISBN (10 or 13 digits)').fill(isbn);
    await page.getByPlaceholder('Title').fill(uniqueTitle('Dup'));
    await page.getByPlaceholder('Author').fill('E2E Author');
    await page.getByPlaceholder('Year').fill('2010');
    await page.getByRole('button', { name: 'Add Book' }).click();

    await expect(page.locator('.msg.err')).toContainText(/isbn/i);
  });

  test('E2E-G1-07: future publication year is rejected in the form', async ({ page }) => {
    await page.getByPlaceholder('ISBN (10 or 13 digits)').fill(uniqueIsbn());
    await page.getByPlaceholder('Title').fill(uniqueTitle('Future'));
    await page.getByPlaceholder('Author').fill('E2E Author');
    await page.getByPlaceholder('Year').fill(String(currentYear + 1));
    await page.getByRole('button', { name: 'Add Book' }).click();

    await expect(page.locator('.msg.err')).toContainText(/year/i);
  });

  test('E2E-G1-08: availability column reflects the copy count on add', async ({ page }) => {
    const title = uniqueTitle('E2E Avail');
    await page.getByPlaceholder('ISBN (10 or 13 digits)').fill(uniqueIsbn());
    await page.getByPlaceholder('Title').fill(title);
    await page.getByPlaceholder('Author').fill('E2E Author');
    await page.getByPlaceholder('Year').fill('2010');
    await page.getByPlaceholder('Copies').fill('3');
    await page.getByRole('button', { name: 'Add Book' }).click();

    await expect(page.locator('.msg.ok')).toContainText('added');
    const row = page.getByRole('row').filter({ hasText: title });
    await expect(row).toContainText('3 / 3');
  });

  test('E2E-G1-09: editing total copies updates the available-copies display', async ({ page }) => {
    const title = uniqueTitle('E2E Copies');
    await createBook({ title, totalCopies: 2 });
    await page.reload();

    await page.getByRole('cell', { name: title, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Book Details' })).toBeVisible();
    await expect(page.getByText('2 / 2')).toBeVisible();

    await page.locator('input[value="2"]').fill('4');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.locator('.msg.ok')).toContainText('Saved');
    await expect(page.getByText('4 / 4').first()).toBeVisible();
  });
});
