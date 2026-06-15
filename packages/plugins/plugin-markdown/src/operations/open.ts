//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { MarkdownOperation } from '../types';

const handler: Operation.WithHandler<typeof MarkdownOperation.Open> = MarkdownOperation.Open.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ doc }) {
      const { content } = yield* doc.pipe(
        Database.load,
        Effect.map((_) => _.content),
        Effect.flatMap(Database.load),
      );
      return { content };
    }),
  ),
);

export default handler;
