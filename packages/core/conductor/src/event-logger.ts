//
// Copyright 2025 DXOS.org
//

import { Effect, Context } from 'effect';

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
