import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import type { BrowserContext } from '@playwright/test'
import { chromium, expect, test } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const extensionPath = path.resolve(__dirname, '..', '.output', 'chrome-mv3')
const consoleErrorAllowlist: RegExp[] = []

function filterAllowed(errors: string[]) {
  return errors.filter((message) => !consoleErrorAllowlist.some((pattern) => pattern.test(message)))
}

async function launchExtension() {
  if (!fs.existsSync(extensionPath)) {
    throw new Error('Missing built extension. Run: pnpm -C apps/chrome-extension build')
  }

  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'summarize-ext-'))
  const headless = process.env.HEADLESS === '1'
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    args: [`--disable-extensions-except=${extensionPath}`, `--load-extension=${extensionPath}`],
  })

  const page = await context.newPage()
  const pageErrors: Error[] = []
  const consoleErrors: string[] = []

  page.on('pageerror', (error) => pageErrors.push(error))
  page.on('console', (message) => {
    if (message.type() !== 'error') return
    consoleErrors.push(message.text())
  })

  const background =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent('serviceworker', { timeout: 15_000 }))
  const extensionId = new URL(background.url()).host

  await page.goto(`chrome-extension://${extensionId}/sidepanel.html`, {
    waitUntil: 'domcontentloaded',
  })
  await page.waitForSelector('#title')

  return { context, page, pageErrors, consoleErrors, userDataDir }
}

async function closeExtension(context: BrowserContext, userDataDir: string) {
  await context.close()
  fs.rmSync(userDataDir, { recursive: true, force: true })
}

test('sidepanel loads without runtime errors', async () => {
  const { context, pageErrors, consoleErrors, userDataDir } = await launchExtension()

  try {
    await new Promise((resolve) => setTimeout(resolve, 500))
    expect(pageErrors.map((error) => error.message)).toEqual([])
    expect(filterAllowed(consoleErrors)).toEqual([])
  } finally {
    await closeExtension(context, userDataDir)
  }
})

test('scheme picker supports keyboard selection', async () => {
  const { context, page, pageErrors, consoleErrors, userDataDir } = await launchExtension()

  try {
    await page.click('#drawerToggle')
    await expect(page.locator('#drawer')).toBeVisible()

    const schemeLabel = page.locator('label.scheme')
    const schemeTrigger = schemeLabel.locator('.pickerTrigger')
    await schemeTrigger.focus()
    await schemeTrigger.press('ArrowDown')
    await page.keyboard.press('ArrowDown')
    await page.keyboard.press('Enter')

    await expect(schemeTrigger.locator('.scheme-label')).toHaveText('Cedar')
    expect(pageErrors.map((error) => error.message)).toEqual([])
    expect(filterAllowed(consoleErrors)).toEqual([])
  } finally {
    await closeExtension(context, userDataDir)
  }
})
