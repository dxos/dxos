//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';

import { BrainOperation } from '#types';

import { spaceFacts } from './space-facts.ts';

export default BrainOperation.ListFacts.pipe(
  Operation.withHandler(
    Effect.fn(function* () {
      return { facts: yield* spaceFacts({}) };
    }),
  ),
);
