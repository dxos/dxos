//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Read } from './definitions';

export default Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ script }) {
      const loaded = yield* Database.load(script);
      const text = yield* Database.load(loaded.source);

      return {
        name: loaded.name,
        source: text.content,
        description: loaded.description,
      };
    }),
  ),
);
