//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Blueprint, Operation } from '@dxos/compute';
import { Filter, Registry } from '@dxos/echo';

import { QueryBlueprints } from './definitions';

export default QueryBlueprints.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const registry = yield* Registry.Service;
      const blueprints = registry.query(Filter.type(Blueprint.Blueprint)).runSync();
      return blueprints.slice().sort(({ name: a }, { name: b }) => a.localeCompare(b));
    }),
  ),
);
