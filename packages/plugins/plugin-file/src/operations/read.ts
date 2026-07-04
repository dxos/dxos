//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Operation } from '@dxos/compute';
import { Blob, Database } from '@dxos/echo';
import { ContentBlock } from '@dxos/types';

import { FileOperation } from '../types';

const handler: Operation.WithHandler<typeof FileOperation.Read> = FileOperation.Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ file }) {
      const obj = yield* Database.load(file);
      const blob = yield* Database.load(obj.data);
      const urlOption = yield* Blob.url(blob);
      const url = yield* Option.match(urlOption, {
        onSome: Effect.succeed,
        // No renderable URL from the backend (e.g. external storage without `getUrl`) — fall back
        // to reading the bytes directly and encoding them as a `data:` URL.
        onNone: () =>
          Blob.read(blob).pipe(
            Effect.map((bytes) => `data:${obj.type};base64,${Buffer.from(bytes).toString('base64')}`),
          ),
      });

      return ContentBlock.ContentBlockResult.make({
        content: [
          ContentBlock.File.make({
            url,
            name: obj.name,
            mediaType: obj.type,
          }),
        ],
      });
    }),
  ),
);

export default handler;
