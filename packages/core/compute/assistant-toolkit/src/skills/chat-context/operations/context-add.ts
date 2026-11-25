//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AiContext } from '@dxos/assistant';
import * as Operation from '@dxos/compute/Operation';

import { ContextAdd } from './definitions.ts';

export default ContextAdd.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ obj }) {
      yield* AiContext.bindCurrent({ skills: [], objects: [obj] });
    }),
  ),
);
