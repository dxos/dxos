//
// Copyright 2023 DXOS.org
//

import type fs from 'node:fs';
import { type FileHandle } from 'node:fs/promises';

import { scheduleTask } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';

enum FileState {
  INIT = 'INIT',
  READING = 'READING',
  REACHED_END = 'REACHED_END',
  DONE = 'DONE',
}

// TODO(burdon): Comment.
export class Printer {
  private state = FileState.INIT;
  private stream?: fs.ReadStream;
  private offset: number;
  private waited = 0;

  private readonly _ctx = new Context();

  constructor(private readonly params: { file: FileHandle; start: number; timeout: number; interval: number }) {
    this.offset = params.start;
  }

  async start() {
    invariant(this.state === FileState.INIT);
    await this._readToEnd();
  }

  private async _readToEnd() {
    this.state = FileState.READING;
    const stream = this.params.file.createReadStream({ start: this.offset, end: Infinity });
    stream.on('data', this._handleData.bind(this));
    stream.on('end', this._handleEnd.bind(this));
  }

  private async _handleData(data: Buffer) {
    if (this.state !== FileState.READING) {
      return;
    }

    this.offset += data.length;
  }

  private async _handleEnd() {
    this.state = FileState.REACHED_END;

    if (this._finished()) {
      return;
    }

    scheduleTask(
      this._ctx,
      async () => {
        await this._readToEnd();
        this.waited += this.params.interval;
      },
      this.params.interval,
    );
  }

  private _finished() {
    return this.state === FileState.DONE || this.waited > this.params.timeout;
  }

  async close() {
    this.state = FileState.DONE;
    void this._ctx.dispose();
    this.stream?.destroy();
    await this.params.file.close();
  }
}
