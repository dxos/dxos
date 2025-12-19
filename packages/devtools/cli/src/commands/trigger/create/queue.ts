//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Prompt from '@effect/cli/Prompt';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as HashMap from 'effect/HashMap';
import * as Option from 'effect/Option';

import { Database, Filter, Ref, Type } from '@dxos/echo';
import { Function, Trigger } from '@dxos/functions';

import { CommandConfig } from '../../../services';
import { flushAndSync, print, spaceLayer, types, withTypes } from '../../../util';
import { Common } from '../../options';
import { Enabled, Input, Queue } from '../options';
import { printTrigger, promptForSchemaInput, selectFunction, selectQueue } from '../util';

export const queue = Command.make(
  'queue',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    enabled: Enabled,
    functionId: Common.functionId.pipe(Options.optional),
    queue: Queue.pipe(Options.optional),
    input: Input.pipe(Options.optional),
  },
  (options) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      const functionId = yield* Option.match(options.functionId, {
        onNone: () => selectFunction(),
        onSome: (id) => Effect.succeed(id),
      });
      const functions = yield* Database.Service.runQuery(Filter.type(Function.Function));
      const fn = functions.find((fn) => fn.id === functionId);
      if (!fn) {
        return yield* Effect.fail(new Error(`Function not found: ${functionId}`));
      }

      const queueDxn = yield* Option.match(options.queue, {
        onNone: () => selectQueue(),
        onSome: (dxn) => Effect.succeed(dxn.toString()),
      });

      const input = yield* Option.match(options.input, {
        onNone: () => promptForSchemaInput(fn.inputSchema ? Type.toEffectSchema(fn.inputSchema) : undefined),
        onSome: (value) => Effect.succeed(Object.fromEntries(HashMap.toEntries(value))),
      });

      // Always prompt for enabled if functionId is not provided.
      const enabled = yield* Option.match(options.functionId, {
        onNone: () =>
          Prompt.confirm({
            message: 'Enable the trigger?',
            initial: true,
          }).pipe(Prompt.run),
        onSome: () => Effect.succeed(options.enabled),
      });

      const trigger = Trigger.make({
        function: Ref.make(fn),
        enabled,
        spec: {
          kind: 'queue',
          queue: queueDxn,
        },
        input,
      });

      yield* Database.Service.add(trigger);

      if (json) {
        yield* Console.log(JSON.stringify(trigger, null, 2));
      } else {
        yield* Console.log(print(yield* printTrigger(trigger)));
      }

      yield* flushAndSync({ indexes: true });
    }),
).pipe(
  Command.withDescription('Create a queue trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(Function.Function, Trigger.Trigger, ...types)),
);
