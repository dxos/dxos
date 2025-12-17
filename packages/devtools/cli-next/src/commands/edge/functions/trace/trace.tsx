//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { SpaceProperties } from '@dxos/client-protocol';
import { Database, Filter } from '@dxos/echo';
import { QueueService } from '@dxos/functions';
import { InvocationTraceEndEvent, InvocationTraceStartEvent } from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { App, render } from '../../../../components';
import { theme } from '../../../../theme';
import { createLogBuffer, spaceLayer, withTypes } from '../../../../util';
import { Common } from '../../../options';

import { Trace } from './components/Trace';

// Defines the custom `trace` command for edge functions.
export const trace = Command.make(
  'trace',
  {
    functionId: Common.functionId.pipe(Options.optional),
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  ({ functionId, spaceId }) =>
    Effect.gen(function* () {
      const { db } = yield* Database.Service;
      const { queues } = yield* QueueService;
      yield* Console.log('Starting invocation trace...');

      const logBuffer = createLogBuffer();
      log.config({ filter: process.env.DX_DEBUG ?? 'info' });
      log.runtimeConfig.processors = [logBuffer.processor];
      log.info('trace: command starting', { spaceId, functionId });

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
      });
    }),
).pipe(
  Command.withDescription('Trace function invocations.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
  Command.provideEffectDiscard(() => withTypes(InvocationTraceStartEvent, InvocationTraceEndEvent)),
);
