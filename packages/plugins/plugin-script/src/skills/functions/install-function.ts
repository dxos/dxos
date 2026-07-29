//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Operation } from '@dxos/compute';
import { Context } from '@dxos/context';
import { Filter, Obj } from '@dxos/echo';
import { FunctionsServiceClient } from '@dxos/edge-compute';

import { InstallFunction } from './definitions';

export default InstallFunction.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ key }) {
      const client = yield* ClientService;
      const functionsService = FunctionsServiceClient.fromClient(client);
      const deployed = yield* Effect.promise(() => functionsService.query(Context.default()));

      const fn = deployed.findLast((entry) => Obj.getMeta(entry).key === key);
      if (!fn) {
        return yield* Effect.fail(new Error(`No deployed function found with key: ${key}`));
      }

      const space = client.spaces.get()[0];
      if (!space) {
        return yield* Effect.fail(new Error('No space available'));
      }

      yield* Effect.promise(() => client.addTypes([Operation.PersistentOperation]));

      const existingFunctions = yield* Effect.promise(() =>
        space.db.query(Filter.and(Filter.type(Operation.PersistentOperation), Filter.key(key))).run(),
      );

      let installed: Operation.PersistentOperation;
      if (existingFunctions.length > 0) {
        installed = existingFunctions[0];
        for (const existing of existingFunctions) {
          Operation.setFrom(existing, fn);
        }
      } else {
        installed = Obj.clone(fn);
        space.db.add(installed);
      }

      return {
        function: Obj.getURI(installed),
        name: fn.name ?? 'Unnamed function',
        version: Obj.getMeta(fn).version ?? '0.0.0',
      };
    }),
  ),
);
