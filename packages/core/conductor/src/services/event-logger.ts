//
// Copyright 2025 DXOS.org
//

import { Effect, Context } from 'effect';

import { invariant } from '@dxos/invariant';
import { log, LogLevel } from '@dxos/log';

export type ComputeEvent =
  | {
      type: 'begin-compute';
      nodeId: string;
      inputs: Record<string, any>;
    }
  | {
      type: 'end-compute';
      nodeId: string;
      outputs: Record<string, any>;
    }
  | {
      type: 'compute-input';
      nodeId: string;
      property: string;
      value: any;
    }
  | {
      type: 'compute-output';
      nodeId: string;
      property: string;
      value: any;
    }
  | {
      type: 'custom';
      nodeId: string;
      event: any;
    };

export class EventLogger extends Context.Tag('EventLogger')<
  EventLogger,
  { readonly log: (event: ComputeEvent) => void; readonly nodeId: string | undefined }
>() {}

export const logCustomEvent = (data: any) =>
  Effect.gen(function* () {
    const logger = yield* EventLogger;
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

export const createEventLogger = (level: LogLevel, message: string = 'event'): Context.Tag.Service<EventLogger> => {
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
    log: (event: ComputeEvent) => {
      logFunction(message, event);
    },
    nodeId: undefined,
  };
};
