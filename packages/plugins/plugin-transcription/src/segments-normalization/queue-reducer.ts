//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { type Context, Resource } from '@dxos/context';
import { type Queue } from '@dxos/echo-db';
import { type ObjectId } from '@dxos/echo-schema';
import { compositeRuntime } from '@dxos/echo-signals/runtime';
import { type QueueCursor } from '@dxos/protocols';

export class QueueReducer<T extends { id: ObjectId }> extends Resource {
  private readonly _signal = compositeRuntime.createSignal();

  private _reducedMessages: T[] = [];

  constructor(
    private readonly _queue: Queue<T>,
    cursor: QueueCursor,
  ) {
    super();
  }

  protected override async _open(ctx: Context): Promise<void> {
    const unsubscribe = effect(() => {
      if (this._queue.isLoading) {
        return;
      }

      this._signal.notifyRead();
    });
    this._ctx.onDispose(() => unsubscribe());
  }

  protected override async _close(): Promise<void> {}

  get items() {
    this._signal.notifyRead();
    return this._reducedMessages;
  }
}
