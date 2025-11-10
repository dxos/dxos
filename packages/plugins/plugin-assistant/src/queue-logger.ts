//
// Copyright 2025 DXOS.org
//

import { type Queue, Ref, type Space, getSpace } from '@dxos/client/echo';
import { type Sequence, type SequenceEvent, type SequenceLogger } from '@dxos/conductor';
import { DXN, Key, Obj } from '@dxos/echo';
import {
  InvocationTraceEndEvent,
  InvocationTraceEventType,
  InvocationTraceStartEvent
} from '@dxos/functions-runtime';
import { invariant } from '@dxos/invariant';
import { QueueSubspaceTags } from '@dxos/keys';
import { TraceEvent } from "@dxos/functions-runtime";
import { InvocationOutcome } from "@dxos/functions-runtime";
import { InvocationTraceEvent } from "@dxos/functions-runtime";

export class QueueLogger implements SequenceLogger {
  private _space: Space;
  private _invocationTraceQueue: Queue<InvocationTraceEvent>;

  constructor(private readonly sequence: Sequence) {
    const space = getSpace(sequence);
    invariant(space, 'Space not found');
    this._space = space;
    let dxn = this._space.properties.invocationTraceQueue?.dxn;
    if (!dxn) {
      dxn = DXN.fromQueue(QueueSubspaceTags.TRACE, this._space.id, Key.ObjectId.random());
      this._space.properties.invocationTraceQueue = Ref.fromDXN(dxn);
    }
    this._invocationTraceQueue = this._space.queues.get(dxn);
  }

  log(event: SequenceEvent) {
    switch (event.type) {
      case 'begin':
        void this._invocationTraceQueue.append([
          Obj.make(InvocationTraceStartEvent, {
            type: InvocationTraceEventType.START,
            invocationId: event.invocationId,
            timestamp: Date.now(),
            input: {},
            invocationTraceQueue: Ref.fromDXN(this._getTraceQueueDxn(event.invocationId)),
            invocationTarget: Ref.make(this.sequence),
          }),
        ]);
        break;
      case 'end':
        void this._invocationTraceQueue.append([
          Obj.make(InvocationTraceEndEvent, {
            type: InvocationTraceEventType.END,
            invocationId: event.invocationId,
            timestamp: Date.now(),
            outcome: InvocationOutcome.SUCCESS,
          }),
        ]);
        break;
      case 'step-start':
      case 'step-complete':
        void this._getTraceEventQueue(event.invocationId).append([
          Obj.make(TraceEvent, {
            outcome: event.type,
            truncated: false,
            ingestionTimestamp: Date.now(),
            logs: [
              {
                timestamp: Date.now(),
                level: 'info',
                message: event.type,
                context: { step: event.step },
              },
            ],
            exceptions: [],
          }),
        ]);
        break;
      case 'message':
        void this._getTraceEventQueue(event.invocationId).append([
          Obj.make(TraceEvent, {
            outcome: event.type,
            truncated: false,
            ingestionTimestamp: Date.now(),
            logs: [
              {
                timestamp: Date.now(),
                level: 'info',
                message: event.type,
                context: { message: event.message },
              },
            ],
            exceptions: [],
          }),
        ]);
        break;
      case 'block':
        void this._getTraceEventQueue(event.invocationId).append([
          Obj.make(TraceEvent, {
            outcome: event.type,
            truncated: false,
            ingestionTimestamp: Date.now(),
            logs: [
              {
                timestamp: Date.now(),
                level: 'info',
                message: event.type,
                context: { block: event.block },
              },
            ],
            exceptions: [],
          }),
        ]);
        break;
    }
  }

  private _getTraceQueueDxn(invocationId: string): DXN {
    return DXN.fromQueue(QueueSubspaceTags.TRACE, this._space.id, invocationId);
  }

  private _getTraceEventQueue(invocationId: string): Queue<TraceEvent> {
    const dxn = this._getTraceQueueDxn(invocationId);
    return this._space.queues.get(dxn);
  }
}
