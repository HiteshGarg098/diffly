import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { CHANGED, ORIGINAL, compare, editorText } from './fixtures.ts'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

const removals = (page: Page, n: number) => page.getByText(`−${n}`, { exact: true })
const additions = (page: Page, n: number) => page.getByText(`+${n}`, { exact: true })

async function moreAction(page: Page, name: string) {
  await page.getByRole('button', { name: 'More actions' }).click()
  return page.getByRole('menuitem', { name })
}

test('compares two texts and counts changes', async ({ page }) => {
  await compare(page)
  await expect(removals(page, 2)).toBeVisible()
  await expect(additions(page, 3)).toBeVisible()
  await expect(page.getByText('2 changes')).toBeVisible()
  await expect(page.locator('.cm-changedText').first()).toBeVisible()
  // Ribbons join the two panes, and the change map has one tick per change.
  await expect(page.locator('.sbs-ribbons path')).toHaveCount(2)
  await expect(page.getByRole('navigation', { name: 'Change map' }).getByRole('button')).toHaveCount(2)
})

test('Cmd/Ctrl+Enter compares from the input screen', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Original text' }).fill('a\n')
  await page.getByRole('textbox', { name: 'Changed text' }).fill('b\n')
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(removals(page, 1)).toBeVisible()
})

test('next change and the change map move between changes', async ({ page }) => {
  await compare(page)
  await expect(page.getByText('2 changes')).toBeVisible()
  await page.getByRole('button', { name: 'Next change' }).click()
  await expect(page.getByText('Change 1 of 2')).toBeVisible()
  await page.getByRole('button', { name: 'Go to change 2' }).click()
  await expect(page.getByText('Change 2 of 2')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Go to change 2' })).toHaveAttribute('aria-current', 'true')
})

test('merge button, undo toast, take all and reset', async ({ page }) => {
  await compare(page)
  await expect(await moreAction(page, 'Reset merges')).toBeDisabled()
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Merge change into left' }).first().click()
  await expect(page.getByText('Merged 1 change into left')).toBeVisible()
  await expect(removals(page, 2)).toBeHidden()

  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(removals(page, 2)).toBeVisible()

  await (await moreAction(page, 'Take all into left')).click()
  await expect(page.getByText('No differences left')).toBeVisible()
  expect(await editorText(page, 0)).toContain('export default hello')

  await (await moreAction(page, 'Reset merges')).click()
  await expect(removals(page, 2)).toBeVisible()
  expect(await editorText(page, 0)).not.toContain('export default')
})

test('layout and ignore whitespace sit in the toolbar', async ({ page }) => {
  await compare(page, 'a  b\n', 'a b\n')
  // Ignore whitespace and Hide unchanged are on by default.
  const ws = page.getByRole('button', { name: 'Ignore whitespace' })
  await expect(ws).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Hide unchanged' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('No differences', { exact: true })).toBeVisible()
  await ws.click()
  await expect(ws).toHaveAttribute('aria-pressed', 'false')
  await expect(removals(page, 1)).toBeVisible()

  await page.getByRole('button', { name: 'Unified' }).click()
  await expect(page.locator('.cm-mergeView')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Unified' })).toHaveAttribute('aria-pressed', 'true')
})

test('exports a patch that describes the change', async ({ page }) => {
  await compare(page)
  await page.getByRole('button', { name: 'Export' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('menuitem', { name: /Unified patch/ }).click(),
  ])
  expect(download.suggestedFilename()).toBe('changed.patch')
  const patch = await readFile(await download.path(), 'utf8')
  expect(patch).toContain('--- a/original.txt')
  expect(patch).toContain('+export default hello')
})

test('export menu is keyboard accessible', async ({ page }) => {
  await compare(page)
  const button = page.getByRole('button', { name: 'Export' })
  await button.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem').first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toBeHidden()
  await expect(button).toBeFocused()
})

test('command palette runs actions from the keyboard', async ({ page }) => {
  await compare(page)
  await page.keyboard.press('ControlOrMeta+k')
  const palette = page.getByRole('dialog', { name: 'Command palette' })
  await expect(palette).toBeVisible()
  await page.keyboard.type('unified')
  await expect(page.getByRole('option', { name: 'Unified layout' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Enter')
  await expect(palette).toBeHidden()
  await expect(page.getByRole('button', { name: 'Unified' })).toHaveAttribute('aria-pressed', 'true')

  await page.getByRole('button', { name: 'Search actions' }).click()
  await expect(palette).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(palette).toBeHidden()
})

test('transform menu applies to both sides', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Original text' }).fill('b\na')
  await page.getByRole('textbox', { name: 'Changed text' }).fill('a\nb')
  await page.getByRole('button', { name: 'Transform both sides' }).click()
  await page.getByRole('menuitem', { name: 'Sort lines' }).click()
  await expect(page.getByRole('textbox', { name: 'Original text' })).toHaveValue('a\nb')
})

test('share link reopens the same diff', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await compare(page)
  await page.getByRole('button', { name: /Share/ }).click()
  await expect(page.getByText('Share link copied')).toBeVisible()
  const url = await page.evaluate(() => navigator.clipboard.readText())
  expect(url).toMatch(/#d=/)

  const fresh = await context.newPage()
  await fresh.goto(url)
  await expect(additions(fresh, 3)).toBeVisible()
  expect(await editorText(fresh, 1)).toContain('export default hello')
  // Payload is removed from the address bar after loading.
  expect(new URL(fresh.url()).hash).toBe('')
})

test('history keeps comparisons across reloads', async ({ page }) => {
  await compare(page)
  await expect(additions(page, 3)).toBeVisible()
  await page.reload()

  const recent = page.getByRole('region', { name: 'Recent comparisons' })
  await recent.getByRole('button', { name: /^function hello\(name\)/ }).click()
  await expect(additions(page, 3)).toBeVisible()
  expect(await editorText(page, 0)).toContain(ORIGINAL.split('\n')[0])
  expect(await editorText(page, 1)).toContain(CHANGED.split('\n')[3])
})

test('? opens the shortcuts dialog and Esc closes it', async ({ page }) => {
  await page.locator('body').press('?')
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})

test('phone width keeps the main controls without horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await compare(page)
  await expect(page.getByRole('button', { name: 'Next change' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ignore whitespace' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'More actions' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
})
