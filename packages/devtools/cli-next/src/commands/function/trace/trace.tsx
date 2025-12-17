//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as BunContext from '@effect/platform-bun/BunContext';
import * as Console from 'effect/Console';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import * as Option from 'effect/Option';

import { ClientService, ConfigService } from '@dxos/client';
import { SpaceProperties } from '@dxos/client-protocol';
import { Database, Filter } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { InvocationTraceEndEvent, InvocationTraceStartEvent, TriggerDispatcher } from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { App, render } from '../../../components';
import { CommandConfig } from '../../../services';
import { theme } from '../../../theme';
import { createLogBuffer, spaceIdWithDefault, spaceLayer, triggerRuntimeLayer, withTypes } from '../../../util';
import { Common } from '../../options';

import { Trace } from './components/Trace';

// Defines the custom `trace` command for edge functions.
export const trace = Command.make(
  'trace',
  {
    functionId: Common.functionId.pipe(Options.optional),
    spaceId: Common.spaceId.pipe(Options.optional),
    enableTriggers: Options.boolean('enable-triggers', { ifPresent: true }).pipe(
      Options.withDescription('Enable local trigger runtime to run functions in the background.'),
    ),
  },
  ({ functionId, spaceId, enableTriggers }) =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const { queues } = yield* QueueService;
      yield* Console.log('Starting invocation trace...');

      const logBuffer = createLogBuffer();
      log.config({ filter: process.env.DX_DEBUG ?? 'info' });
      log.runtimeConfig.processors = [logBuffer.processor];
      log.info('trace: command starting', { spaceId, functionId, enableTriggers });

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
      let triggerRuntime: ManagedRuntime.ManagedRuntime<any, any> | undefined;
      let triggerRuntimeFiber: Fiber.Fiber<void, void> | undefined;
      if (enableTriggers) {
        yield* Console.log('Starting local trigger runtime...');

        const { profile } = yield* CommandConfig;
        const resolvedSpaceId = yield* spaceIdWithDefault(spaceId);
        const client = yield* ClientService;
        const config = yield* ConfigService;
        const dbService = yield* Database.Service;

        // Create the runtime layer
        const layer = triggerRuntimeLayer({
          spaceId: Option.some(resolvedSpaceId),
          livePollInterval: Duration.seconds(1), // Default 1 second poll interval
          profile,
        }).pipe(
          // Provide required services
          Layer.provide(Layer.succeed(ClientService, client)),
          Layer.provide(Layer.succeed(ConfigService, config)),
          Layer.provide(Layer.succeed(Database.Service, dbService)),
          Layer.provide(BunContext.layer),
        );

        // Create managed runtime and start trigger dispatcher in background
        triggerRuntime = ManagedRuntime.make(layer);
        triggerRuntimeFiber = yield* Effect.promise(() =>
          triggerRuntime!.runPromise(TriggerDispatcher.pipe(Effect.flatMap((dispatcher) => dispatcher.start()))),
        ).pipe(Effect.forkDaemon);

        yield* Console.log('Trigger runtime started in background.');
      }

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
          enableTriggers && triggerRuntimeFiber && triggerRuntime
            ? () => {
                // Stop trigger runtime on exit
                log.info('Stopping trigger runtime...');
                Effect.runSync(
                  Fiber.interrupt(triggerRuntimeFiber!).pipe(
                    Effect.flatMap(() =>
                      Effect.promise(() =>
                        triggerRuntime!.runPromise(
                          TriggerDispatcher.pipe(Effect.flatMap((dispatcher) => dispatcher.stop())),
                        ),
                      ),
                    ),
                    Effect.tap(() => Effect.sync(() => log.info('Trigger runtime stopped.'))),
                  ),
                );
              }
            : undefined,
      });
    }),
).pipe(
  Command.withDescription('Trace function invocations.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(InvocationTraceStartEvent, InvocationTraceEndEvent)),
);
