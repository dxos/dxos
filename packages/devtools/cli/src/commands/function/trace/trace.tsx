//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as BunContext from '@effect/platform-bun/BunContext';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';

import { CommandConfig, Common } from '@dxos/cli-util';
import { ClientService, ConfigService } from '@dxos/client';
import { SpaceProperties } from '@dxos/client-protocol';
import { Database, Filter, type Key } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { InvocationTraceEndEvent, InvocationTraceStartEvent, TriggerDispatcher } from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { App, render } from '../../../components';
import { theme } from '../../../theme';
import { createLogBuffer, spaceIdWithDefault, spaceLayer, triggerRuntimeLayer, withTypes } from '../../../util';

import { Trace } from './components/Trace';

// Defines the custom `trace` command for edge functions.
export const trace = Command.make(
  'trace',
  {
    functionId: Common.functionId.pipe(Options.optional),
    spaceId: Common.spaceId.pipe(Options.optional),
    localTriggers: Options.boolean('local-triggers', { ifPresent: true }).pipe(
      Options.withDescription('Enable local trigger runtime to run functions in the background.'),
    ),
  },
  ({ functionId, spaceId, localTriggers }) =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const { queues } = yield* QueueService;
      log.info('Starting invocation trace...');

      const logBuffer = createLogBuffer();
      log.config({ filter: process.env.DX_DEBUG ?? 'info' });
      log.runtimeConfig.processors = [logBuffer.processor];
      log.info('trace: command starting', { spaceId, functionId, localTriggers });

      // Query for SpaceProperties to get the invocation trace queue DXN.
      const objects = yield* Database.Service.runQuery(Filter.type(SpaceProperties));
      const properties = objects.at(0);
      invariant(properties, 'SpaceProperties not found');
      const queueDxn = properties.invocationTraceQueue?.dxn;

      if (!queueDxn) {
        log.info('trace: no invocationTraceQueue found in space properties', { spaceId: db.spaceId });
      } else {
        log.info('trace: found invocationTraceQueue', { spaceId: db.spaceId, queueDxn });
      }

      // Start trigger runtime in background if enabled
      const { profile } = yield* CommandConfig;
      const triggerRuntimeResult = localTriggers ? yield* createTriggerRuntime(spaceId, profile) : undefined;
      const triggerRuntime = triggerRuntimeResult?.runtime;
      const triggerRuntimeFiber = triggerRuntimeResult?.fiber;

      // Render.
      yield* render({
        app: () => (
          // TODO(wittjosiah): Rather than pass db and queues probably should have some sort of context provider then introduce hooks for interacting with the db and queues.
          <App focusElements={['table']} logBuffer={logBuffer} theme={theme}>
            <Trace
              db={db}
              queues={queues}
              queueDxn={queueDxn ? Option.some(queueDxn) : Option.none()}
              functionId={functionId}
            />
          </App>
        ),
        focusElements: ['table'],
        logBuffer,
        theme,
        onDestroy:
          localTriggers && triggerRuntimeFiber && triggerRuntime
            ? () => {
                // Stop trigger runtime on exit
                log.info('Stopping trigger runtime...');
                void triggerRuntime.runPromise(Fiber.interrupt(triggerRuntimeFiber!));
                log.info('Trigger runtime stopped.');
              }
            : undefined,
      });
    }),
).pipe(
  Command.withDescription('Trace function invocations.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(InvocationTraceStartEvent, InvocationTraceEndEvent)),
);

/**
 * Creates and starts a trigger runtime with its fiber.
 * Returns both the runtime and fiber for cleanup.
 */
const createTriggerRuntime = Effect.fn((spaceId: Option.Option<Key.SpaceId>, profile: string) =>
  Effect.gen(function* () {
    log.info('Starting local trigger runtime...');

    const resolvedSpaceId = yield* spaceIdWithDefault(spaceId);
    const client = yield* ClientService;
    const config = yield* ConfigService;
    const dbService = yield* Database.Service;

    // Create the runtime layer
    const layer = triggerRuntimeLayer({
      spaceId: Option.some(resolvedSpaceId),
      livePollInterval: Duration.seconds(1),
      profile,
    }).pipe(
      // Provide required services
      Layer.provide(Layer.succeed(ClientService, client)),
      Layer.provide(Layer.succeed(ConfigService, config)),
      Layer.provide(Layer.succeed(Database.Service, dbService)),
      Layer.provide(BunContext.layer),
    );

    // Create managed runtime and start trigger dispatcher in background
    const runtime = ManagedRuntime.make(layer);
    const triggerEffect = TriggerDispatcher.pipe(
      Effect.flatMap((dispatcher) =>
        Effect.acquireRelease(
          Effect.gen(function* () {
            yield* dispatcher.start();
            return dispatcher;
          }),
          (dispatcher) => dispatcher.stop(),
        ),
      ),
      Effect.scoped,
      Effect.asVoid,
    );
    const fiber = runtime.runFork(triggerEffect);

    log.info('Trigger runtime started in background.');

    return { runtime, fiber };
  }),
);
