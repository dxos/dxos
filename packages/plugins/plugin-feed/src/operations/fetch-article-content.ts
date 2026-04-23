//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';

import { extractImageUrls, stripHtml } from '../util';
import { FetchArticleContent } from './definitions';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE_BYTES = 2_000_000;
const MAX_RESPONSE_BYTES_HEADER = 5_000_000;

/** Exact-match hostname denylist. Defense-in-depth against trivial SSRF when this handler runs
 * in a trusted/worker context. Not a substitute for DNS-level egress filtering when available. */
const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '::1',
  '169.254.169.254', // AWS/GCP/Azure instance metadata endpoint
  'metadata.google.internal',
]);

/** Throws unless `link` is an http(s) URL targeting a non-loopback, non-metadata host. */
const validateUrl = (link: string): URL => {
  const url = new URL(link);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (BLOCKED_HOSTS.has(host)) {
    throw new Error(`Blocked host: ${host}`);
  }
  return url;
};

/** Read the body with a hard byte cap; prevents unbounded memory use on adversarial responses.
 * Throws if the stream API is unavailable so we never silently bypass the cap. */
const readCapped = async (response: Response, limit: number): Promise<string> => {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body stream unavailable.');
  }
  const decoder = new TextDecoder('utf-8');
  let received = 0;
  let out = '';
  while (received < limit) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    if (value) {
      received += value.byteLength;
      out += decoder.decode(value, { stream: true });
    }
  }
  try {
    await reader.cancel();
  } catch {
    // Ignore cancel errors.
  }
  return (out + decoder.decode()).slice(0, limit);
};

const handler: Operation.WithHandler<typeof FetchArticleContent> = FetchArticleContent.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ post: postRef }) {
      const post = yield* Database.load(postRef);
      invariant(post.link, 'Post has no link.');
      const html = yield* Effect.tryPromise({
        try: async () => {
          const url = validateUrl(post.link!);
          const response = await fetch(url.toString(), {
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
            redirect: 'follow',
          });
          if (!response.ok) {
            throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
          }
          const contentLength = response.headers.get('content-length');
          if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES_HEADER) {
            throw new Error(`Response too large: ${contentLength} bytes`);
          }
          return readCapped(response, MAX_RESPONSE_BYTES);
        },
        catch: (error) =>
          new Error(`Failed to fetch article: ${String(error)}`, { cause: error instanceof Error ? error : undefined }),
      });
      return {
        text: stripHtml(html),
        imageUrls: extractImageUrls(html),
      };
    }),
  ),
);

export default handler;
