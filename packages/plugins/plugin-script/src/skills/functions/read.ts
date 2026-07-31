//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import type * as Script from '@dxos/compute/Script';
import { Database } from '@dxos/echo';

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
