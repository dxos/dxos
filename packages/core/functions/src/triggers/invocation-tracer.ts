import { SpaceId, DXN, ObjectId } from '@dxos/keys';
import { Context, Schema, Effect, Layer } from 'effect';
import type { TriggerKind } from '../types';
import { QueueService, DatabaseService } from '../services';
import { Obj, Query, Ref } from '@dxos/echo';
import { PropertiesType } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';
import {
  InvocationOutcome,
  InvocationTraceEndEvent,
  InvocationTraceEventType,
  InvocationTraceStartEvent,
} from '../trace';

export type FunctionInvocationPayload = {
  data?: any;
  inputNodeId?: string;
  trigger?: {
    id: string;
    kind: TriggerKind;
  };
};

export type TraceData = {
  invocationId: ObjectId;
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
    }): Effect.Effect<TraceData>;

    traceInvocationEnd({ trace, exception }: { trace: TraceData; exception?: any }): Effect.Effect<void>;
  }
>() {
  static layerLive = Layer.effect(
    InvocationTracer,
    Effect.gen(function* () {
      const queues = yield* QueueService;
      const db = yield* DatabaseService;

      const resolveSpaceInvocationsQueue = Effect.fn('resolveSpaceInvocationQueue')(
        function* () {
          const {
            objects: [properties],
          } = yield* DatabaseService.runQuery(Query.type(PropertiesType));
          invariant(properties);
          if (!properties.invocationTraceQueue) {
            properties.invocationTraceQueue = Ref.fromDXN(queues.queues.create({ subspaceTag: 'trace' }).dxn);
          }
          const queue = properties.invocationTraceQueue.target;
          invariant(queue);
          return queue;
        },
        Effect.provideService(DatabaseService, db),
      );

      return {
        traceInvocationStart: Effect.fn('traceInvocationStart')(function* ({ payload, target }) {
          const invocationId = ObjectId.random();
          const invocationsQueue = yield* resolveSpaceInvocationsQueue();

          const now = Date.now();
          const traceEvent = Obj.make(InvocationTraceStartEvent, {
            type: InvocationTraceEventType.START,
            invocationId,
            timestampMs: now,
            input: payload.data,
            // invocationTraceQueue: Ref.fromDXN(invocationQueue),
            invocationTarget: target ? Ref.fromDXN(target) : undefined,
            trigger: payload.trigger ? Ref.fromDXN(DXN.fromLocalObjectId(payload.trigger.id)) : undefined,
          });
          yield* Effect.promise(() => invocationsQueue.append([traceEvent]));

          return { invocationId };
        }),
        traceInvocationEnd: Effect.fn('traceInvocationEnd')(function* ({ trace, exception }) {
          const invocationsQueue = yield* resolveSpaceInvocationsQueue();

          const now = Date.now();
          const traceEvent = Obj.make(InvocationTraceEndEvent, {
            type: InvocationTraceEventType.END,
            invocationId: trace.invocationId,
            timestampMs: now,
            outcome: exception ? InvocationOutcome.FAILURE : InvocationOutcome.SUCCESS,
            exception: exception
              ? {
                  name: exception.constructor.name,
                  timestampMs: now,
                  message: exception?.message ?? 'Unknown error',
                  stack: exception?.stack,
                }
              : undefined,
          });
          yield* Effect.promise(() => invocationsQueue.append([traceEvent]));
        }),
      };
    }),
  );
}
