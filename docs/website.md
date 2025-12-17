# Website mode

Use this for non-YouTube URLs.

## What it does

- Fetches the page HTML.
- Extracts “article-ish” content and normalizes it into clean text.
- If extraction looks blocked or too thin, it can retry via Firecrawl (Markdown).

## Flags

- `--firecrawl off|auto|always`
- `--timeout 30s|30|2m|5000ms`
- `--extract-only` (print extracted text, no OpenAI call)
- `--json` (emit a single JSON object)
- `--verbose` (progress + which extractor was used)

## API keys

- Optional: `FIRECRAWL_API_KEY` (for the Firecrawl fallback)

