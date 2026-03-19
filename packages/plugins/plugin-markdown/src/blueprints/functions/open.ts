//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Open } from './definitions';

export default Open.pipe(
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
