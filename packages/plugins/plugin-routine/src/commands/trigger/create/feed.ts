//
// Copyright 2025 DXOS.org
//

import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Command from 'effect/unstable/cli/Command';
import * as Options from 'effect/unstable/cli/Flag';
import * as Prompt from 'effect/unstable/cli/Prompt';

import { CommandConfig } from '@dxos/cli-util';
import { flushAndSync, print, spaceLayer, withTypes } from '@dxos/cli-util';
import { Common } from '@dxos/cli-util';
import * as Operation from '@dxos/compute/Operation';
import * as Trigger from '@dxos/compute/Trigger';
import { Database, Filter, JsonSchema, Ref, Feed as Feed$ } from '@dxos/echo';
import { EID } from '@dxos/keys';

import { Enabled, Feed, Input } from '../options.ts';
import { printTrigger, promptForSchemaInput, selectFeed, selectFunction } from '../util.ts';

export const feed = Command.make(
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
        // v4's key/value flag yields a plain record rather than a `HashMap`.
        onSome: (value) => Effect.succeed(value),
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
