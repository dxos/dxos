//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database } from '@dxos/echo';
import { File } from '@dxos/types';
import { safeFetchBytes, validateExternalUrl } from '@dxos/util';

import { FileLimits, FileOperation } from '#types';

import { FileReadError, FileTooLargeError, UnsupportedFileTypeError, resolveActiveStorage } from './create.ts';

/**
 * Cap on the `base64` arm. Far below the storage limits on purpose: the payload arrives as a
 * tool-call argument, so it occupies the caller's context inflated 4/3 by the encoding. Anything
 * larger belongs on the `http` arm, where the bytes never cross the model at all.
 */
export const MAX_INLINE_SOURCE_BYTES = 1024 * 1024;

/** Cap and timeout for the `http` arm, matching `plugin-crm`'s long-standing values. */
export const MAX_FETCHED_BYTES = 10 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;

const decodeBase64 = (data: string): Uint8Array => {
  // `atob` rejects whitespace, which a model will readily introduce when wrapping long lines.
  const binary = atob(data.replace(/\s/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; ++index) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

/**
 * Resolves the source to bytes plus the MIME type to trust.
 *
 * The type always comes from the source's own declaration — the `mediaType` field, or the response
 * `Content-Type` — never from the URL's extension. A `.png` URL that serves something else is the
 * exact case that makes extension-sniffing exploitable.
 */
const resolveSource = (source: typeof FileOperation.FileSource.Type) =>
  Effect.gen(function* () {
    switch (source.type) {
      case 'base64': {
        // Checked before `atob`, not after: the decoded length is knowable from the encoded one, so
        // there is no reason to materialize an oversized buffer just to reject it.
        const encodedLength = source.data.replace(/\s/g, '').length;
        if (Math.floor((encodedLength * 3) / 4) > MAX_INLINE_SOURCE_BYTES) {
          return yield* Effect.fail(
            new FileTooLargeError(Math.floor((encodedLength * 3) / 4), MAX_INLINE_SOURCE_BYTES),
          );
        }

        const bytes = yield* Effect.try({
          try: () => decodeBase64(source.data),
          catch: (error) => new FileReadError(error),
        });
        if (bytes.byteLength > MAX_INLINE_SOURCE_BYTES) {
          return yield* Effect.fail(new FileTooLargeError(bytes.byteLength, MAX_INLINE_SOURCE_BYTES));
        }
        return { bytes, type: source.mediaType };
      }

      case 'http': {
        // The URL is chosen by the caller — a model, in the case this operation exists for — so the
        // guard is not optional. No proxy: this runs headless, where there is no CORS constraint to
        // work around and no reason to route the bytes through an extra hop.
        const url = yield* Effect.try({
          try: () => validateExternalUrl(source.url),
          catch: (error) => new FileReadError(error),
        });
        const downloaded = yield* Effect.tryPromise({
          try: () => safeFetchBytes(url, { maxBytes: MAX_FETCHED_BYTES, timeoutMs: FETCH_TIMEOUT_MS }),
          catch: (error) => new FileReadError(error),
        });
        if (!downloaded.contentType) {
          return yield* Effect.fail(new UnsupportedFileTypeError('(none declared)'));
        }
        return { bytes: downloaded.bytes, type: downloaded.contentType };
      }
    }
  });

const handler: Operation.WithHandler<typeof FileOperation.CreateFromSource> = FileOperation.CreateFromSource.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ source, name }) {
      const { bytes, type } = yield* resolveSource(source);
      if (!FileLimits.isAcceptedMimeType(type)) {
        return yield* Effect.fail(new UnsupportedFileTypeError(type));
      }

      // Shared with the UI path, so the two cannot diverge on which backend an upload lands in.
      const storage = yield* resolveActiveStorage;
      const object = yield* File.fromBytes(bytes, { name, type, storage }).pipe(
        Effect.catchTag('BlobTooLargeError', () => Effect.fail(new FileTooLargeError(bytes.byteLength))),
      );
      yield* Database.add(object);
      return { object };
    }),
  ),
);

export default handler;
