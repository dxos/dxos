//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Blueprint } from '@dxos/blueprints';
import { Operation } from '@dxos/operation';

import { QueryBlueprints } from './definitions';

export default QueryBlueprints.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const registry = yield* Blueprint.RegistryService;
      return registry.query();
    }),
  ),
);
