//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { FileOperation } from '../types';

const handler: Operation.WithHandler<typeof FileOperation.Read> = FileOperation.Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ file }) {
      const obj = yield* Database.load(file);
      const url =
        obj.data._tag === 'inline'
          ? `data:${obj.type};base64,${Buffer.from(obj.data.bytes).toString('base64')}`
          : obj.data.url;

      return {
        content: {
          _tag: 'file' as const,
          url,
          name: obj.name,
          mediaType: obj.type,
        },
      };
    }),
  ),
);

export default handler;
