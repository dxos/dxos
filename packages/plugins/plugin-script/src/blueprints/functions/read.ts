//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { type Script } from '@dxos/functions';
import { Operation } from '@dxos/operation';

import { Read } from './definitions';

export default Read.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ function: fn }) {
      const loaded = yield* Database.load(fn);
      if (!loaded.source) {
        return yield* Effect.fail(new Error('Function has no source script.'));
      }
      const script = (yield* Database.load(loaded.source)) as Script.Script;
      const text = yield* Database.load(script.source);

      return {
        name: script.name,
        source: text.content,
        description: script.description,
      };
    }),
  ),
);
