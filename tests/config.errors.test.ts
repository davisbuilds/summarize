import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { loadSummarizeConfig } from '../src/config.js'

describe('config error handling', () => {
  it('throws on invalid JSON', () => {
    const root = mkdtempSync(join(tmpdir(), 'summarize-config-'))
    const configPath = join(root, 'config.json')
    writeFileSync(configPath, '{not json', 'utf8')

    expect(() => loadSummarizeConfig({ env: {}, configPathArg: configPath })).toThrow(
      /Invalid JSON in config file/
    )
  })

  it('throws when top-level is not an object', () => {
    const root = mkdtempSync(join(tmpdir(), 'summarize-config-'))
    const configPath = join(root, 'config.json')
    writeFileSync(configPath, JSON.stringify(['nope']), 'utf8')

    expect(() => loadSummarizeConfig({ env: {}, configPathArg: configPath })).toThrow(
      /expected an object/
    )
  })
})
