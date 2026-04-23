//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Read } from './definitions';

export default Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ document }) {
      const { content } = yield* document.pipe(
        Database.load,
        Effect.flatMap((doc) => doc.content.pipe(Database.load)),
      );
      return { content };
    }),
  ),
);
