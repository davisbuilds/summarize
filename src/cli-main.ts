import { runCli } from './run.js'

export type CliMainArgs = {
  argv: string[]
  env: Record<string, string | undefined>
  fetch: typeof fetch
  stdout: NodeJS.WritableStream
  stderr: NodeJS.WritableStream
  exit: (code: number) => void
  setExitCode: (code: number) => void
}

export function handlePipeErrors(stream: NodeJS.WritableStream, exit: (code: number) => void) {
  stream.on('error', (error: unknown) => {
    const code = (error as { code?: unknown } | null)?.code
    if (code === 'EPIPE') {
      exit(0)
      return
    }
    throw error
  })
}

export async function runCliMain({
  argv,
  env,
  fetch,
  stdout,
  stderr,
  exit,
  setExitCode,
}: CliMainArgs): Promise<void> {
  handlePipeErrors(stdout, exit)
  handlePipeErrors(stderr, exit)

  try {
    await runCli(argv, { env, fetch, stdout, stderr })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    stderr.write(`${message}\n`)
    setExitCode(1)
  }
}
