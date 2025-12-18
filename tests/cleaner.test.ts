import { describe, expect, it } from 'vitest'

import {
  applyContentBudget,
  clipAtSentenceBoundary,
  decodeHtmlEntities,
  normalizeCandidate,
  normalizeForPrompt,
  normalizeWhitespace,
} from '../src/content/link-preview/content/cleaner.js'

describe('content cleaner utilities', () => {
  it('normalizes whitespace for prompts', () => {
    const input = `Hello\u00A0\u00A0world\t\t\n\n  next \n\n\n line`
    expect(normalizeForPrompt(input)).toBe('Hello world\nnext\nline')
    expect(normalizeWhitespace(input)).toBe('Hello world\nnext\nline')
  })

  it('decodes common HTML entities', () => {
    expect(decodeHtmlEntities('&lt;tag&gt; &amp; &#39;x&#39;')).toBe("<tag> & 'x'")
  })

  it('normalizes candidates', () => {
    expect(normalizeCandidate(null)).toBeNull()
    expect(normalizeCandidate('   ')).toBeNull()
    expect(normalizeCandidate('  A   B \n C  ')).toBe('A B C')
  })

  it('clips at sentence boundary when possible', () => {
    const input = 'First sentence. Second sentence. Third sentence.'
    expect(clipAtSentenceBoundary(input, 22)).toBe('First sentence.')
    expect(clipAtSentenceBoundary(input, 3)).toBe('Fir')
  })

  it('applies a content budget and counts words', () => {
    const content = 'Hello world. This is a test.'
    const result = applyContentBudget(content, 10)
    expect(result.truncated).toBe(true)
    expect(result.totalCharacters).toBe(content.length)
    expect(result.content.length).toBeLessThanOrEqual(10)
    expect(result.wordCount).toBeGreaterThan(0)
  })
})
