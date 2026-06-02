//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Blueprint, Operation } from '@dxos/compute';
import { Database, Entity, Filter, Obj, Registry } from '@dxos/echo';

import { UpdateBlueprints } from './definitions';

export default UpdateBlueprints.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      const registry = yield* Registry.Service;
      const blueprints = yield* Database.runQuery(Filter.type(Blueprint.Blueprint));
      for (const blueprint of blueprints) {
        const key = Obj.getMeta(blueprint).key;
        if (!key) {
          continue;
        }
        const source = registry.list().find((entity) => Entity.getMeta(entity)?.key === key) as
          | Blueprint.Blueprint
          | undefined;
        if (!source) {
          continue;
        }
        Obj.update(blueprint, (b) => {
          void Obj.updateFrom(b, Obj.clone(source, { deep: true }));
        });
      }
    }),
  ),
);
