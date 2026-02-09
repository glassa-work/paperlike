import { test, expect } from "@playwright/test";

test.describe("Editor cursor — contenteditable text input", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("paragraph blocks have contenteditable attributes", async ({ page }) => {
    const paragraphs = page.locator(".block p[contenteditable='true']");
    await expect(paragraphs.first()).toBeVisible();
    expect(await paragraphs.count()).toBeGreaterThanOrEqual(2);
  });

  test("heading blocks have contenteditable attributes", async ({ page }) => {
    const headings = page.locator(
      ".block [contenteditable='true'][data-field='text']:is(h1, h2, h3)",
    );
    await expect(headings.first()).toBeVisible();
  });

  test("list items have contenteditable attributes", async ({ page }) => {
    const items = page.locator(
      ".block li[contenteditable='true'][data-field='item']",
    );
    await expect(items.first()).toBeVisible();
  });

  test("clicking a paragraph places cursor and accepts keyboard input", async ({
    page,
  }) => {
    const para = page.locator(".block p[contenteditable='true']").first();
    const before = await para.textContent();

    await para.click();
    await expect(para).toBeFocused();

    // Type new text at the end
    await page.keyboard.type(" hello");
    const after = await para.textContent();
    expect(after).toBe(before + " hello");
  });

  test("typing in a paragraph updates the doc version counter", async ({
    page,
  }) => {
    const versionEl = page.locator("#doc-version");
    const versionBefore = Number(await versionEl.textContent());

    const para = page.locator(".block p[contenteditable='true']").first();
    await para.click();
    await page.keyboard.type("x");

    const versionAfter = Number(await versionEl.textContent());
    expect(versionAfter).toBeGreaterThan(versionBefore);
  });

  test("Enter inside a paragraph creates a new empty block below", async ({
    page,
  }) => {
    const countEl = page.locator("#block-count");
    const countBefore = Number(await countEl.textContent());

    const para = page.locator(".block p[contenteditable='true']").first();
    await para.click();
    await page.keyboard.press("Enter");

    const countAfter = Number(await countEl.textContent());
    expect(countAfter).toBe(countBefore + 1);
  });

  test("arrow keys inside text move the caret, not the block focus", async ({
    page,
  }) => {
    const para = page.locator(".block p[contenteditable='true']").first();
    await para.click();

    // Arrow left should keep focus in the same element, not jump to another block
    await page.keyboard.press("ArrowLeft");
    await expect(para).toBeFocused();

    await page.keyboard.press("ArrowRight");
    await expect(para).toBeFocused();
  });

  test("Backspace inside text deletes characters, not the block", async ({
    page,
  }) => {
    const countEl = page.locator("#block-count");
    const para = page.locator(".block p[contenteditable='true']").first();
    await para.click();

    // Type then backspace — block count should stay the same
    await page.keyboard.type("abc");
    const countBefore = Number(await countEl.textContent());

    await page.keyboard.press("Backspace");
    const countAfter = Number(await countEl.textContent());
    expect(countAfter).toBe(countBefore);

    const text = await para.textContent();
    expect(text!.endsWith("ab")).toBe(true);
  });

  test("Escape blurs contenteditable without removing the block", async ({
    page,
  }) => {
    const para = page.locator(".block p[contenteditable='true']").first();
    await para.click();
    await expect(para).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(para).not.toBeFocused();

    // Block should still exist
    await expect(para).toBeVisible();
  });

  test("editor title is contenteditable", async ({ page }) => {
    const title = page.locator(".editor-title[contenteditable='true']");
    await expect(title).toBeVisible();
    await title.click();
    await expect(title).toBeFocused();
  });
});
