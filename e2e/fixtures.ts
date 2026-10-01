import type { Page } from '@playwright/test'

export const ORIGINAL = "function hello() {\n  return 'a' + 1\n}\n"
export const CHANGED = "function hello(name) {\n  return 'b' + 2\n}\nexport default hello\n"

export async function compare(page: Page, left = ORIGINAL, right = CHANGED) {
  await page.getByRole('textbox', { name: 'Original text' }).fill(left)
  await page.getByRole('textbox', { name: 'Changed text' }).fill(right)
  await page.getByRole('button', { name: /Find difference/ }).click()
}

/** Current text of the left/right diff editor. */
export function editorText(page: Page, side: 0 | 1) {
  return page.locator('.cm-mergeView .cm-content').nth(side).evaluate((el) => (el as HTMLElement).innerText)
}

/**
 * Paste through the clipboard, like a user would. Playwright's fill() types via
 * insertText, which gets very slow in Chromium for inputs of thousands of lines.
 * Requires clipboard permissions on the context.
 */
export async function pasteInto(page: Page, name: string, text: string) {
  await page.evaluate((t) => navigator.clipboard.writeText(t), text)
  await page.getByRole('textbox', { name }).focus()
  await page.keyboard.press('ControlOrMeta+V')
}
