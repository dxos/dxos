# @dxos/react-url-enricher

Extract and fetch the public web URLs referenced in workspace content so the
rest of the system (LLM prompts, summarizers, previews) can read their text.

Content-agnostic — knows nothing about any specific site. Works for any public
URL where a dumb HTML-to-text conversion is good enough: Granola shares,
Google Docs public links, DocSend, public blog posts, documentation, etc.

## What's in the box

- `extractUrls(text, limit?)` — find URLs in prose; de-duped, punctuation-stripped, in order.
- `htmlToText(html)` — strip HTML tags, decode common entities, collapse whitespace.
- `fetchUrl(url, options?)` — fetch via a proxy endpoint (bypasses CORS), convert HTML to text, cache 15 min.
- `fetchManyUrls(urls, options?)` — parallel fetch; failures are silently skipped.
- `useUrlEnricher(options?)` — React hook that binds the options once and returns memoized callbacks.

## Usage

```tsx
import { extractUrls, useUrlEnricher } from '@dxos/react-url-enricher';

const EnrichButton = ({ context }: { context: string }) => {
  const { fetchMany } = useUrlEnricher({ endpoint: '/api/fetch', maxLength: 4000 });

  const enrich = async () => {
    const urls = extractUrls(context, 3);
    const pages = await fetchMany(urls);
    for (const [url, text] of pages) {
      console.log(url, text.slice(0, 200));
    }
  };

  return <button onClick={enrich}>Enrich</button>;
};
```

## Proxy requirement

`fetchUrl` POSTs to the endpoint (default `/api/fetch`) with the target URL as
a `url` query param. The proxy handles CORS and returns the raw response body
(up to whatever cap the proxy enforces). Composer ships a Vite middleware for
this in dev; production deployments need an equivalent.

Minimum contract for the proxy:

- Accept `GET ${endpoint}?url=<encoded>`.
- Forward the `GET` to the target URL.
- Return the response body with the target's `content-type`.
- Reject non-http(s) schemes.

## Caveats

- `htmlToText` is intentionally regex-based, not a real DOM parser. It's fine
  for LLM-readable text extraction but treat the output as plaintext only;
  never re-inject it as HTML.
- The TTL cache is module-scoped and shared across all callers — which is
  usually what you want, but means you can't have per-instance caches. Use
  `clearUrlCache()` (exported from `./fetch-url`) in tests.
- No retries, no backoff, no robots.txt awareness. Callers are responsible
  for rate-limiting the URLs they pass in.
