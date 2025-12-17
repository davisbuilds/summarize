import { describe, expect, it, vi } from 'vitest'

import * as podcast from '../src/content/link-preview/transcript/providers/podcast.js'
import * as twitter from '../src/content/link-preview/transcript/providers/twitter.js'
import type {
  ProviderContext,
  ProviderFetchOptions,
} from '../src/content/link-preview/transcript/types.js'

const noopFetch = vi.fn(async () => new Response('nope', { status: 500 }))

const contextFor = (url: string): ProviderContext => ({ url, html: null, resourceKey: null })

describe('placeholder transcript providers', () => {
  it('matches podcast URLs', () => {
    expect(podcast.canHandle(contextFor('https://example.com/podcast/123'))).toBe(true)
    expect(podcast.canHandle(contextFor('https://open.spotify.com/show/abc'))).toBe(true)
    expect(podcast.canHandle(contextFor('https://example.com/article'))).toBe(false)
  })

  it('matches twitter/x URLs', () => {
    expect(twitter.canHandle(contextFor('https://x.com/steipete/status/1'))).toBe(true)
    expect(twitter.canHandle(contextFor('https://twitter.com/steipete/status/1'))).toBe(true)
    expect(twitter.canHandle(contextFor('https://example.com/article'))).toBe(false)
  })

  it('returns not_implemented provider metadata', async () => {
    const options: ProviderFetchOptions = {
      fetch: noopFetch as unknown as typeof fetch,
      apifyApiToken: null,
      youtubeTranscriptMode: 'auto',
    }

    const twitterResult = await twitter.fetchTranscript(contextFor('https://x.com/a'), options)
    expect(twitterResult.text).toBeNull()
    expect(twitterResult.metadata).toEqual({ provider: 'twitter', reason: 'not_implemented' })

    const podcastResult = await podcast.fetchTranscript(
      contextFor('https://example.com/podcast'),
      options
    )
    expect(podcastResult.text).toBeNull()
    expect(podcastResult.metadata).toEqual({ provider: 'podcast', reason: 'not_implemented' })
  })
})
