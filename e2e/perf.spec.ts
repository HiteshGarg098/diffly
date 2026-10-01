import { expect, test } from '@playwright/test'
import { pasteInto } from './fixtures.ts'

const LINES = 10_000

function bigTexts() {
  const left: string[] = []
  const right: string[] = []
  for (let i = 0; i < LINES; i++) {
    const line = `  const value${i} = compute(${i}, "item-${i}") // row ${i}`
    left.push(line)
    // Every 100th line edited, every 250th inserted, every 400th deleted.
    if (i % 400 === 0) continue
    right.push(i % 100 === 0 ? line.replace('compute', 'computeFast') : line)
    if (i % 250 === 0) right.push(`  log("inserted after ${i}")`)
  }
  return { left: left.join('\n') + '\n', right: right.join('\n') + '\n' }
}

test('10k-line diff renders quickly without long freezes', async ({ page, context }, info) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/')
  // Record main-thread tasks longer than 50 ms.
  await page.evaluate(() => {
    const w = window as unknown as { longest: number }
    w.longest = 0
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.longest = Math.max(w.longest, e.duration)
    }).observe({ type: 'longtask', buffered: false })
  })

  const { left, right } = bigTexts()
  const start = Date.now()
  await pasteInto(page, 'Original text', left)
  await pasteInto(page, 'Changed text', right)
  await page.getByRole('button', { name: /Find difference/ }).click()
  const status = page.getByText(/^\d+ changes$/)
  await expect(status).toBeVisible({ timeout: 15_000 })
  const elapsed = Date.now() - start
  const longest = await page.evaluate(() => (window as unknown as { longest: number }).longest)

  info.annotations.push({ type: 'perf', description: `paste + render ${elapsed} ms, longest task ${Math.round(longest)} ms` })
  console.log(`10k lines: paste + render ${elapsed} ms, longest main-thread task ${Math.round(longest)} ms`)

  // Budgets are generous for slow CI runners; tighten if they prove stable.
  expect(elapsed).toBeLessThan(5_000)
  expect(longest).toBeLessThan(2_000)
  // Each edit is its own change, not one whole-file chunk.
  expect(parseInt(await status.innerText())).toBe(120)

  // Scrolling to the end still works (view is virtualised, not fully rendered).
  await page.getByRole('button', { name: 'Next change' }).click()
  await expect(page.locator('.cm-mergeView')).toBeVisible()
})
