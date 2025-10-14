//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Schema from 'effect/Schema';

import { Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { LogLevel, log } from '@dxos/log';

import { TracingService } from './tracing';

export const ComputeEventPayload = Schema.Union(
  Schema.Struct({
    type: Schema.Literal('begin-compute'),
    nodeId: Schema.String,
    inputs: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }),
  Schema.Struct({
    type: Schema.Literal('end-compute'),
    nodeId: Schema.String,
    outputs: Schema.Record({ key: Schema.String, value: Schema.Any }),
  }),
  Schema.Struct({
    type: Schema.Literal('compute-input'),
    nodeId: Schema.String,
    property: Schema.String,
    value: Schema.Any,
  }),
  Schema.Struct({
    type: Schema.Literal('compute-output'),
    nodeId: Schema.String,
    property: Schema.String,
    value: Schema.Any,
  }),
  Schema.Struct({
    type: Schema.Literal('custom'),
    nodeId: Schema.String,
    event: Schema.Any,
  }),
);
export type ComputeEventPayload = Schema.Schema.Type<typeof ComputeEventPayload>;

export const ComputeEvent = Schema.Struct({
  payload: ComputeEventPayload,
}).pipe(Type.Obj({ typename: 'dxos.org/type/ComputeEvent', version: '0.1.0' }));

/**
 * Logs event for the compute workflows.
 */
export class ComputeEventLogger extends Context.Tag('@dxos/functions/ComputeEventLogger')<
  ComputeEventLogger,
  { readonly log: (event: ComputeEventPayload) => void; readonly nodeId: string | undefined }
>() {
  static noop: Context.Tag.Service<ComputeEventLogger> = {
    log: () => {},
    nodeId: undefined,
  };

  /**
   * Implements ComputeEventLogger using TracingService.
   */
  static layerFromTracing = Layer.effect(
    ComputeEventLogger,
    Effect.gen(function* () {
      const tracing = yield* TracingService;
      return {
        log: (event: ComputeEventPayload) => {
          tracing.write(Obj.make(ComputeEvent, { payload: event }));
        },
        nodeId: undefined,
      };
    }),
  );
}

export const logCustomEvent = (data: any) =>
  Effect.gen(function* () {
    const logger = yield* ComputeEventLogger;
    if (!logger.nodeId) {
      throw new Error('logCustomEvent must be called within a node compute function');
    }
    logger.log({
      type: 'custom',
      nodeId: logger.nodeId,
      event: data,
    });
  });

export const createDefectLogger = <A, E, R>(): ((self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>) =>
  Effect.catchAll((error) =>
    Effect.gen(function* () {
      log.error('unhandled effect error', { error });
      throw error;
    }),
  );

export const createEventLogger = (
  level: LogLevel,
  message: string = 'event',
): Context.Tag.Service<ComputeEventLogger> => {
  const logFunction = (
    {
      [LogLevel.WARN]: log.warn,
      [LogLevel.VERBOSE]: log.verbose,
      [LogLevel.DEBUG]: log.debug,
      [LogLevel.INFO]: log.info,
      [LogLevel.ERROR]: log.error,
    } as any
  )[level];
  invariant(logFunction);
  return {
    log: (event: ComputeEventPayload) => {
      logFunction(message, event);
    },
    nodeId: undefined,
  };
};
