//
// Copyright 2025 DXOS.org
//

import { type BlueprintLogger, type BlueprintEvent, type Blueprint } from '@dxos/assistant';
import { getSpace, Ref, type Space, type Queue } from '@dxos/client/echo';
import { DXN, Key } from '@dxos/echo';
import { create } from '@dxos/echo-schema';
import {
  InvocationTraceStartEvent,
  InvocationTraceEventType,
  type InvocationTraceEvent,
  InvocationTraceEndEvent,
  InvocationOutcome,
  TraceEvent,
} from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { QueueSubspaceTags } from '@dxos/keys';

export class QueueLogger implements BlueprintLogger {
  private _space: Space;
  private _invocationTraceQueue: Queue<InvocationTraceEvent>;

  constructor(private readonly blueprint: Blueprint) {
    const space = getSpace(blueprint);
    invariant(space, 'Space not found');
    this._space = space;
    let dxn = this._space.properties.invocationTraceQueue?.dxn;
    if (!dxn) {
      dxn = DXN.fromQueue(QueueSubspaceTags.TRACE, this._space.id, Key.ObjectId.random());
      this._space.properties.invocationTraceQueue = Ref.fromDXN(dxn);
    }
    this._invocationTraceQueue = this._space.queues.get(dxn);
  }

  log(event: BlueprintEvent) {
    switch (event.type) {
      case 'begin':
        this._invocationTraceQueue.append([
          create(InvocationTraceStartEvent, {
            type: InvocationTraceEventType.START,
            invocationId: event.invocationId,
            timestampMs: Date.now(),
            input: {},
            invocationTraceQueue: Ref.fromDXN(this._getTraceQueueDxn(event.invocationId)),
            invocationTarget: Ref.make(this.blueprint),
          }),
        ]);
        break;
      case 'end':
        this._invocationTraceQueue.append([
          create(InvocationTraceEndEvent, {
            type: InvocationTraceEventType.END,
            invocationId: event.invocationId,
            timestampMs: Date.now(),
            outcome: InvocationOutcome.SUCCESS,
          }),
        ]);
        break;
      case 'step-start':
      case 'step-complete':
        this._getTraceEventQueue(event.invocationId).append([
          create(TraceEvent, {
            outcome: event.type,
            truncated: false,
            ingestionTimestampMs: Date.now(),
            logs: [
              {
                timestampMs: Date.now(),
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
        this._getTraceEventQueue(event.invocationId).append([
          create(TraceEvent, {
            outcome: event.type,
            truncated: false,
            ingestionTimestampMs: Date.now(),
            logs: [
              {
                timestampMs: Date.now(),
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
        this._getTraceEventQueue(event.invocationId).append([
          create(TraceEvent, {
            outcome: event.type,
            truncated: false,
            ingestionTimestampMs: Date.now(),
            logs: [
              {
                timestampMs: Date.now(),
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
