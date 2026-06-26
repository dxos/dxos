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

import { CommandConfig } from '@dxos/cli-util';
import { flushAndSync, print, spaceLayer, withTypes } from '@dxos/cli-util';
import { Common } from '@dxos/cli-util';
import { Operation, Trigger } from '@dxos/compute';
import { Database, Feed as Feed$, Filter, JsonSchema, Ref } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { Enabled, Feed, Input } from '../options';
import { printTrigger, promptForSchemaInput, selectFunction, selectFeed } from '../util';

export const queue = Command.make(
  'feed',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    enabled: Enabled,
    functionId: Common.functionId.pipe(Options.optional),
    feed: Feed.pipe(Options.optional),
    input: Input.pipe(Options.optional),
  },
  (options) =>
    Effect.gen(function* () {
      const { json } = yield* CommandConfig;

      const functionId = yield* Option.match(options.functionId, {
        onNone: () => selectFunction(),
        onSome: (id) => Effect.succeed(id),
      });
      const functions = yield* Database.query(Filter.type(Operation.PersistentOperation)).run;
      const fn = functions.find((fn) => fn.id === functionId);
      if (!fn) {
        return yield* Effect.fail(new Error(`Function not found: ${functionId}`));
      }

      const feed = yield* Option.match(options.feed, {
        onNone: () => selectFeed(),
        onSome: (uri) => Database.resolve(EID.parse(uri), Feed$.Feed),
      });

      const input = yield* Option.match(options.input, {
        onNone: () => promptForSchemaInput(fn.inputSchema ? JsonSchema.toEffectSchema(fn.inputSchema) : undefined),
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
        runnable: Ref.make(fn),
        enabled,
        spec: Trigger.specFeed(feed),
        input,
      });

      yield* Database.add(trigger);

      if (json) {
        yield* Console.log(JSON.stringify(trigger, null, 2));
      } else {
        yield* Console.log(print(yield* printTrigger(trigger)));
      }

      yield* flushAndSync({ indexes: true });
    }),
).pipe(
  Command.withDescription('Create a feed trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(Operation.PersistentOperation, Trigger.Trigger)),
);
