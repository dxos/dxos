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

/** Throws unless `link` is an http(s) URL. */
const validateUrl = (link: string): URL => {
  const url = new URL(link);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`Unsupported protocol: ${url.protocol}`);
  }
  return url;
};

/** Read the body with a hard byte cap; prevents unbounded memory use on adversarial responses. */
const readCapped = async (response: Response, limit: number): Promise<string> => {
  const reader = response.body?.getReader();
  if (!reader) {
    return (await response.text()).slice(0, limit);
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
  return out + decoder.decode();
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
        catch: (error) => new Error(String(error)),
      });
      return {
        text: stripHtml(html),
        imageUrls: extractImageUrls(html),
      };
    }),
  ),
);

export default handler;
