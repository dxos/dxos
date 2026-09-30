//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Context } from '@dxos/context';
import { Database, Filter, Hypergraph, Obj } from '@dxos/echo';
import { EdgeHttpClientService } from '@dxos/edge-client';
import { FunctionsServiceClient } from '@dxos/edge-compute';

import { InstallFunction } from './definitions.ts';
import { FunctionError } from './errors.ts';

export default InstallFunction.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ key }) {
      const functionsService = new FunctionsServiceClient(yield* EdgeHttpClientService);
      const deployed = yield* Effect.promise(() => functionsService.query(Context.default()));

      const fn = deployed.findLast((entry) => Obj.getMeta(entry).key === key);
      if (!fn) {
        return yield* Effect.fail(new FunctionError({ message: `No deployed function found with key: ${key}` }));
      }

      const { db } = yield* Database.Service;
      const { graph } = yield* Hypergraph.Service;
      graph.registry.add([Operation.PersistentOperation]);

      const existingFunctions = yield* Effect.promise(() =>
        db.query(Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(key))).run(),
      );

      let installed: Operation.PersistentOperation;
      if (existingFunctions.length > 0) {
        installed = existingFunctions[0];
        for (const existing of existingFunctions) {
          Operation.setFrom(existing, fn);
        }
      } else {
        installed = Obj.clone(fn);
        db.add(installed);
      }

      return {
        function: Obj.getURI(installed),
        name: fn.name ?? 'Unnamed function',
        version: Obj.getMeta(fn).version ?? '0.0.0',
      };
    }),
  ),
);
