//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Operation } from '@dxos/compute';
import { Blob, Database } from '@dxos/echo';
import { ContentBlock } from '@dxos/types';

import { FileOperation } from '../types';

const BASE64_CHUNK_SIZE = 0x8000;

// `String.fromCharCode(...bytes)` blows the call stack / argument limit for large arrays, so the
// bytes are base64-encoded in chunks. `Buffer` isn't available in browser bundles.
const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK_SIZE));
  }
  return btoa(binary);
};

const handler: Operation.WithHandler<typeof FileOperation.Read> = FileOperation.Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ file }) {
      const obj = yield* Database.load(file);
      const blob = yield* Database.load(obj.data);
      const type = blob.type ?? 'application/octet-stream';
      const urlOption = yield* Blob.url(blob);
      const url = yield* Option.match(urlOption, {
        onSome: Effect.succeed,
        // No renderable URL from the backend (e.g. external storage without `getUrl`) — fall back
        // to reading the bytes directly and encoding them as a `data:` URL.
        onNone: () => Blob.read(blob).pipe(Effect.map((bytes) => `data:${type};base64,${bytesToBase64(bytes)}`)),
      });

      return ContentBlock.ContentBlockResult.make({
        content: [
          ContentBlock.File.make({
            url,
            name: obj.name,
            mediaType: type,
          }),
        ],
      });
    }),
  ),
);

export default handler;
