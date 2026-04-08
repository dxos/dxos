//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Blueprint } from '@dxos/blueprints';
import { Operation } from '@dxos/operation';

import { UpdateBlueprints } from './definitions';

export default UpdateBlueprints.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const registry = yield* Blueprint.RegistryService;
      yield* registry.updateBlueprints();
    }),
  ),
);
