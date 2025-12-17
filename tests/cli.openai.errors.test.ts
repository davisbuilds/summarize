import { Writable } from 'node:stream'
import { describe, expect, it, vi } from 'vitest'

import { runCli } from '../src/run.js'

const htmlResponse = (html: string, status = 200) =>
  new Response(html, { status, headers: { 'Content-Type': 'text/html' } })

const captureStream = () => {
  let text = ''
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      text += chunk.toString()
      callback()
    },
  })
  return { stream, getText: () => text }
}

describe('cli OpenAI error handling', () => {
  it('throws when OpenAI returns non-2xx', async () => {
    const html =
      '<!doctype html><html><head><title>Hello</title></head>' +
      '<body><article><p>Hi</p></article></body></html>'

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.url
      if (url === 'https://example.com') {
        return htmlResponse(html)
      }
      if (url === 'https://api.openai.com/v1/chat/completions') {
        return new Response('nope', { status: 401 })
      }
      throw new Error(`Unexpected fetch call: ${url}`)
    })

    await expect(
      runCli(['--timeout', '10s', 'https://example.com'], {
        env: { OPENAI_API_KEY: 'test' },
        fetch: fetchMock as unknown as typeof fetch,
        stdout: new Writable({
          write(_c, _e, cb) {
            cb()
          },
        }),
        stderr: new Writable({
          write(_c, _e, cb) {
            cb()
          },
        }),
      })
    ).rejects.toThrow('OpenAI request failed (401): nope')
  })

  it('throws on OpenAI timeout', async () => {
    vi.useFakeTimers()
    try {
      const html =
        '<!doctype html><html><head><title>Hello</title></head>' +
        '<body><article><p>Hi</p></article></body></html>'

      const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof _input === 'string' ? _input : _input.url
        if (url === 'https://example.com') {
          return Promise.resolve(htmlResponse(html))
        }
        if (url === 'https://api.openai.com/v1/chat/completions') {
          const signal = init?.signal
          return new Promise((_resolve, reject) => {
            if (!signal) {
              reject(new Error('Missing abort signal'))
              return
            }
            signal.addEventListener('abort', () =>
              reject(new DOMException('Aborted', 'AbortError'))
            )
          }) as Promise<Response>
        }
        return Promise.reject(new Error(`Unexpected fetch call: ${url}`))
      })

      const stdout = captureStream()

      const promise = runCli(['--timeout', '10ms', 'https://example.com'], {
        env: { OPENAI_API_KEY: 'test' },
        fetch: fetchMock as unknown as typeof fetch,
        stdout: stdout.stream,
        stderr: new Writable({
          write(_c, _e, cb) {
            cb()
          },
        }),
      })

      const assertion = expect(promise).rejects.toThrow('OpenAI request timed out')
      await vi.advanceTimersByTimeAsync(50)
      await assertion
      expect(stdout.getText()).toBe('')
    } finally {
      vi.useRealTimers()
    }
  })

  it('throws when OpenAI refusal is returned', async () => {
    const html =
      '<!doctype html><html><head><title>Hello</title></head>' +
      '<body><article><p>Hi</p></article></body></html>'

    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.url
      if (url === 'https://example.com') {
        return htmlResponse(html)
      }
      if (url === 'https://api.openai.com/v1/chat/completions') {
        return Response.json(
          { choices: [{ message: { content: null, refusal: 'no thanks' } }] },
          { status: 200 }
        )
      }
      throw new Error(`Unexpected fetch call: ${url}`)
    })

    await expect(
      runCli(['--timeout', '10s', 'https://example.com'], {
        env: { OPENAI_API_KEY: 'test' },
        fetch: fetchMock as unknown as typeof fetch,
        stdout: new Writable({
          write(_c, _e, cb) {
            cb()
          },
        }),
        stderr: new Writable({
          write(_c, _e, cb) {
            cb()
          },
        }),
      })
    ).rejects.toThrow('OpenAI refusal: no thanks')
  })
})
