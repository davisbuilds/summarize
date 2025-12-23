import { describe, expect, it } from 'vitest'

import { parseRequestedModelId } from '../src/model-spec.js'

describe('model spec parsing', () => {
  it('parses free mode', () => {
    expect(parseRequestedModelId('free').kind).toBe('free')
    expect(parseRequestedModelId('3').kind).toBe('free')
  })

  it('parses cli model ids', () => {
    const parsed = parseRequestedModelId('cli/claude/sonnet')
    expect(parsed.kind).toBe('fixed')
    expect(parsed.transport).toBe('cli')
    expect(parsed.cliProvider).toBe('claude')
    expect(parsed.cliModel).toBe('sonnet')
  })
})
