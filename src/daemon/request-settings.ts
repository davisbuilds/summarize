import type { LengthArg } from '../flags.js'
import type { OutputLanguage } from '../language.js'
import type { SummaryLengthTarget } from '../prompts/index.js'
import type { RunOverrides } from '../run/run-settings.js'
import {
  resolveOutputLanguageSetting,
  resolveRunOverrides,
  resolveSummaryLength,
} from '../run/run-settings.js'

export type DaemonRunOverrides = RunOverrides

export function resolveDaemonSummaryLength(raw: unknown): {
  lengthArg: LengthArg
  summaryLength: SummaryLengthTarget
} {
  return resolveSummaryLength(raw, 'xl')
}

export function resolveDaemonOutputLanguage({
  raw,
  fallback,
}: {
  raw: unknown
  fallback: OutputLanguage
}): OutputLanguage {
  return resolveOutputLanguageSetting({ raw, fallback })
}

export function resolveDaemonRunOverrides(raw: {
  firecrawl?: unknown
  markdownMode?: unknown
  preprocess?: unknown
  youtube?: unknown
  timeout?: unknown
  retries?: unknown
  maxOutputTokens?: unknown
}): DaemonRunOverrides {
  return resolveRunOverrides(raw)
}
