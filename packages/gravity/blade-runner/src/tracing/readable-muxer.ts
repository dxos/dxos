//
// Copyright 2024 DXOS.org
//

import { scheduleMicroTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';

/**
 * Muxes multiple readable streams together into one.
 * Do not guarantee the order of the chunks.
 */
export class ReadableMuxer<T> {
  public readonly readable: ReadableStream<T>;

  private _readableController!: ReadableStreamDefaultController<T>;

  private readonly _ctx = new Context();

  constructor() {
    this.readable = new ReadableStream<T>({
      start: (controller) => {
        this._readableController = controller;
      },
      cancel: () => {},
    });
    this._ctx.onDispose(() => this._readableController.close());
  }

  pushStream(stream: ReadableStream<T>) {
    const reader = stream.getReader();
    this._ctx.onDispose(() => reader.cancel());
    scheduleMicroTask(this._ctx, async () => {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        this._readableController.enqueue(value);
      }
    });
    log.info('done');
  }

  async close() {
    await this._ctx.dispose();
  }
}
