# Tweets / X URLs

There is no dedicated tweet/thread extractor yet.

## Current behavior

- Tweet URLs are treated as “website mode”.
- Direct HTML fetching may fail (login walls, dynamic rendering, bot protection).
- If enabled, Firecrawl can sometimes extract a readable Markdown snapshot for public tweets/threads, but results depend on what X serves to crawlers.

## Future options

- Dedicated thread extraction via the X API (requires auth + rate limit handling).
- Dedicated “public page” extraction strategy (when the content is accessible without auth).

