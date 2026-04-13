//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig, Common, flushAndSync, printList, spaceLayer } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';
import { Context } from '@dxos/context';
import { Database, Filter, Obj } from '@dxos/echo';
import { getDeployedFunctions } from '@dxos/functions-runtime/edge';
import { Operation } from '@dxos/operation';

import { getFunctionStatus, printFunction, selectDeployedFunction } from './util';

export const importCommand = Command.make(
  'import',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    key: Args.text({ name: 'key' }).pipe(Args.withDescription('Function key'), Args.optional),
  },
  ({ key }) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;
      const client = yield* ClientService;

      // TODO(dmaretskyi): Extract.
      yield* Effect.promise(() => client.addTypes([Operation.PersistentOperation]));

      // Produce normalized in-memory FunctionType objects for display.
      const fns = yield* Effect.promise(() => getDeployedFunctions(Context.default(), client, true));
      if (fns.length === 0) {
        return yield* Effect.fail(new Error('No deployed functions available'));
      }

      // If key is not provided, prompt interactively
      const selectedKey = yield* Option.match(key, {
        onNone: () => selectDeployedFunction(fns),
        onSome: (k) => Effect.succeed(k),
      });

      // We take the last deployment under a given key.
      // TODO(dmaretskyi): Should we make the keys unique?
      const fn = fns.findLast((fn) => fn.key === selectedKey);
      if (!fn) {
        return yield* Effect.fail(new Error(`Function not found: ${selectedKey}`));
      }

      // Query database for existing functions with the same key
      const existingFunctions = yield* Database.runQuery(
        Filter.type(Operation.PersistentOperation, { key: selectedKey }),
      );

      let updatedFunctions: Operation.PersistentOperation[];
      if (existingFunctions.length > 0) {
        // Update all existing functions with the same key
        for (const existingFunction of existingFunctions) {
          Operation.setFrom(existingFunction, fn);
        }
        updatedFunctions = existingFunctions;
      } else {
        // Add new function
        const newFunction = yield* Database.add(Obj.clone(fn));
        updatedFunctions = [newFunction];
      }

      // Get status for display (after update/add, function should be up-to-date)
      // Re-query to get the updated state
      const updatedDbFunctions = yield* Database.runQuery(Filter.type(Operation.PersistentOperation));
      const status = getFunctionStatus(fn, updatedDbFunctions);

      if (json) {
        yield* Console.log(JSON.stringify(updatedFunctions, null, 2));
      } else {
        const formatted = updatedFunctions.map((f) => printFunction(f, status));
        yield* Console.log(printList(formatted));
      }

      yield* flushAndSync({ indexes: true });
    }),
).pipe(
  Command.withDescription('Import a function deployed to EDGE.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
