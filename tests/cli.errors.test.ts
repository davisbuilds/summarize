import { Writable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'

import { runCli } from '../src/run.js'

const noopStream = () =>
  new Writable({
    write(chunk, encoding, callback) {
      void chunk
      void encoding
      callback()
    },
  })

describe('cli error handling', () => {
  it('errors when url is missing', async () => {
    await expect(
      runCli([], {
        env: {},
        fetch: globalThis.fetch.bind(globalThis),
        stdout: noopStream(),
        stderr: noopStream(),
      })
    ).rejects.toThrow(/Usage: summarize/)
  })

  it('errors when --prompt and --extract-only are both set', async () => {
    await expect(
      runCli(['--prompt', '--extract-only', 'https://example.com'], {
        env: {},
        fetch: vi.fn(
          async () => new Response('<html></html>', { status: 200 })
        ) as unknown as typeof fetch,
        stdout: noopStream(),
        stderr: noopStream(),
      })
    ).rejects.toThrow('--prompt and --extract-only are mutually exclusive')
  })

  it('errors when --firecrawl always is set without a key', async () => {
    await expect(
      runCli(['--firecrawl', 'always', '--extract-only', 'https://example.com'], {
        env: {},
        fetch: vi.fn(
          async () => new Response('<html></html>', { status: 200 })
        ) as unknown as typeof fetch,
        stdout: noopStream(),
        stderr: noopStream(),
      })
    ).rejects.toThrow('--firecrawl always requires FIRECRAWL_API_KEY')
  })
})
