const { test, expect } = require('@playwright/test');
const { uniqueIsbn, createBook } = require('../../helpers/factories');

test.describe('Books — UI CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/'); 
    await expect(page.getByRole('heading', { name: 'Add Book' })).toBeVisible();
  });

  test('E2E-G1-01: add a book via the form (positive)', async ({ page }) => {
    const title = `E2E Add ${Date.now()}`;

    await page.getByPlaceholder('ISBN (10 or 13 digits)').fill(uniqueIsbn());
    await page.getByPlaceholder('Title').fill(title);
    await page.getByPlaceholder('Author').fill('E2E Author');
    await page.getByPlaceholder('Genre').fill('Testing');
    await page.getByPlaceholder('Year').fill('2010');
    await page.getByPlaceholder('Copies').fill('2');
    await page.getByRole('button', { name: 'Add Book' }).click();

    await expect(page.locator('.msg.ok')).toContainText('added');
    await expect(page.getByRole('cell', { name: title, exact: true })).toBeVisible();
  });

  test('E2E-G1-02: shows a validation error for an invalid ISBN (negative)', async ({ page }) => {
    await page.getByPlaceholder('ISBN (10 or 13 digits)').fill('not-an-isbn');
    await page.getByPlaceholder('Title').fill('Invalid ISBN Book');
    await page.getByPlaceholder('Author').fill('E2E Author');
    await page.getByPlaceholder('Year').fill('2010');
    await page.getByRole('button', { name: 'Add Book' }).click();

    await expect(page.locator('.msg.err')).toBeVisible();
    await expect(page.locator('.msg.err')).toContainText(/isbn/i);
  });

  test('E2E-G1-03: edit a book and persist the change', async ({ page }) => {
    const original = `E2E Edit ${Date.now()}`;
    const updated = `${original} (updated)`;
    await createBook({ title: original, author: 'Before' });

    await page.reload();
    await page.getByRole('cell', { name: original, exact: true }).click();

    await expect(page.getByRole('heading', { name: 'Book Details' })).toBeVisible();
    await page.locator(`input[value="${original}"]`).fill(updated);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.locator('.msg.ok')).toContainText('Saved');
    await expect(page.locator(`input[value="${updated}"]`)).toBeVisible();
  });

  test('E2E-G1-04: delete a book via the detail view', async ({ page }) => {
    const title = `E2E Delete ${Date.now()}`;
    await createBook({ title });

    await page.reload();
    await page.getByRole('cell', { name: title, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Book Details' })).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete Book' }).click();

    await expect(page.getByRole('heading', { name: 'Add Book' })).toBeVisible();
    await expect(page.getByRole('cell', { name: title, exact: true })).toHaveCount(0);
  });

  test('E2E-G1-10: full lifecycle — add → view → edit → delete', async ({ page }) => {
    const title = `E2E Lifecycle ${Date.now()}`;
    const renamed = `${title} (renamed)`;

    await page.getByPlaceholder('ISBN (10 or 13 digits)').fill(uniqueIsbn());
    await page.getByPlaceholder('Title').fill(title);
    await page.getByPlaceholder('Author').fill('Lifecycle Author');
    await page.getByPlaceholder('Year').fill('2015');
    await page.getByRole('button', { name: 'Add Book' }).click();
    await expect(page.locator('.msg.ok')).toContainText('added');

    await page.locator('tbody').getByRole('cell', { name: title, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Book Details' })).toBeVisible();

    await page.locator(`input[value="${title}"]`).fill(renamed);
    await page.getByRole('button', { name: 'Save Changes' }).click();
    await expect(page.locator('.msg.ok')).toContainText('Saved');
    await expect(page.locator(`input[value="${renamed}"]`)).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete Book' }).first().click();
    await expect(page.getByRole('heading', { name: 'Add Book' })).toBeVisible();
    await expect(page.locator('tbody').getByRole('cell', { name: renamed, exact: true })).toHaveCount(0);
  });
});
