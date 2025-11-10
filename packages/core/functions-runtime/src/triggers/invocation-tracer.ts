//
// Copyright 2025 DXOS.org
//

import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';

import { Obj, Ref } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { QueueService } from '@dxos/functions';
import { DXN, ObjectId } from '@dxos/keys';

import {
  InvocationOutcome,
  InvocationTraceEndEvent,
  InvocationTraceEventType,
  InvocationTraceStartEvent,
} from '../trace';
import type { Trigger } from '@dxos/functions';

export type FunctionInvocationPayload = {
  data?: any;
  inputNodeId?: string;
  trigger?: {
    id: string;
    kind: Trigger.Kind;
  };
};

export type TraceData = {
  invocationId: ObjectId;
  invocationTraceQueue: Queue;
};

export class InvocationTracer extends Context.Tag('@dxos/functions/InvocationTracer')<
  InvocationTracer,
  {
    traceInvocationStart({
      payload,
      target,
    }: {
      payload: FunctionInvocationPayload;
      target?: DXN;
    }): Effect.Effect<TraceData, never, QueueService>;

    traceInvocationEnd({ trace, exception }: { trace: TraceData; exception?: any }): Effect.Effect<void>;
  }
>() {
  static layerLive = (opts: { invocationTraceQueue: Queue }) =>
    Layer.effect(
      InvocationTracer,
      Effect.gen(function* () {
        return {
          traceInvocationStart: Effect.fn('traceInvocationStart')(function* ({ payload, target }) {
            const invocationId = ObjectId.random();
            const invocationTraceQueue = yield* QueueService.createQueue({ subspaceTag: 'trace' });
            const now = Date.now();
            const traceEvent = Obj.make(InvocationTraceStartEvent, {
              type: InvocationTraceEventType.START,
              invocationId,
              timestamp: now,
              // TODO(dmaretskyi): Not json-stringifying this makes ECHO fail when one ECHO object becomes embedded in another ECHO object.
              input: JSON.parse(JSON.stringify(payload.data ?? {})),
              invocationTraceQueue: Ref.fromDXN(invocationTraceQueue.dxn),
              invocationTarget: target ? Ref.fromDXN(target) : undefined,
              trigger: payload.trigger ? Ref.fromDXN(DXN.fromLocalObjectId(payload.trigger.id)) : undefined,
            });
            yield* QueueService.append(opts.invocationTraceQueue, [traceEvent]);

            return { invocationId, invocationTraceQueue };
          }),
          traceInvocationEnd: Effect.fn('traceInvocationEnd')(function* ({ trace, exception }) {
            const now = Date.now();
            const traceEvent = Obj.make(InvocationTraceEndEvent, {
              type: InvocationTraceEventType.END,
              invocationId: trace.invocationId,
              timestamp: now,
              outcome: exception ? InvocationOutcome.FAILURE : InvocationOutcome.SUCCESS,
              exception: exception
                ? {
                    name: exception.constructor.name,
                    timestamp: now,
                    message: exception?.message ?? 'Unknown error',
                    stack: exception?.stack,
                  }
                : undefined,
            });
            yield* QueueService.append(opts.invocationTraceQueue, [traceEvent]);
          }),
        };
      }),
    );

  static layerTest = Layer.unwrapEffect(
    Effect.gen(function* () {
      const queue = yield* QueueService.createQueue({ subspaceTag: 'trace' });
      return InvocationTracer.layerLive({ invocationTraceQueue: queue });
    }),
  );
}
