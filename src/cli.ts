import { runCliMain } from './cli-main.js'

await runCliMain({
  argv: process.argv.slice(2),
  env: process.env,
  fetch: globalThis.fetch.bind(globalThis),
  stdout: process.stdout,
  stderr: process.stderr,
  exit: (code) => process.exit(code),
  setExitCode: (code) => {
    process.exitCode = code
  },
})
