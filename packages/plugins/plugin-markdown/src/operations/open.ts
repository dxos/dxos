//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Operation } from '@dxos/compute';
import { Database } from '@dxos/echo';

import { Open } from './definitions';

const handler: Operation.WithHandler<typeof Open> = Open.pipe(
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
