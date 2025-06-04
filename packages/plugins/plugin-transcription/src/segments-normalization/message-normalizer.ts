//
// Copyright 2025 DXOS.org
//

//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { asyncTimeout, DeferredTask } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type Queue } from '@dxos/echo-db';
import { create, getMeta } from '@dxos/echo-schema';
import { type FunctionExecutor } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { sentenceNormalization } from './normalization';
import { getActorId } from './utils';
import { isNonNullable } from '@dxos/util';
import { live } from '@dxos/live-object';

const PROCESSING_TIMEOUT = 10_000; // ms
const SENTENCE_TIMEOUT = 30_000; // ms
const MAX_RANGE_ID_COUNT = 10;

export type SegmentsNormalizerParams = {
  functionExecutor: FunctionExecutor;
  queue: Queue<DataType.Message>;
  startingCursor: QueueCursor;
};

// TODO(mykola): Use generic queue cursor from @dxos/protocols.
export type QueueCursor = {
  actorId: string;
  timestamp: string;
};

// TODO(mykola): .
export class MessageNormalizer extends Resource {
  private readonly _functionExecutor: FunctionExecutor;
  private _queue: Queue<DataType.Message>;
  private _state = live<{ result: { segments: string[]; sentences: string[] }[] }>({ result: [] });
  private _buffer: string[] = [];
  private _cursor: QueueCursor;

  private _messagesToProcess: DataType.Message[] = [];
  private _lastProcessedMessageIds: string[] = [];

  private _normalizationTask?: DeferredTask = undefined;

  constructor({ functionExecutor, queue, startingCursor }: SegmentsNormalizerParams) {
    super();
    this._functionExecutor = functionExecutor;
    this._queue = queue;
    this._cursor = startingCursor;
  }

  /**
   * @reactive
   */
  public get sentences() {
    return this._state.result;
  }

  protected override async _open() {
    this._normalizationTask = new DeferredTask(this._ctx, () => this._processMessages());
    const unsubscribe = effect(() => {
      this._messagesToProcess = this._queue.items.filter((message) => {
        const actorId = getActorId(message.sender);
        return actorId === this._cursor.actorId && message.created > this._cursor.timestamp;
      });

      if (this._messagesToProcess.length <= 1) {
        return;
      }

      this._normalizationTask!.schedule();
    });
    this._ctx.onDispose(() => unsubscribe());
  }

  // Need to unpack strings from blocks from messages run them through the function and then pack them back into blocks into messages.
  private async _processMessages() {
    log.info('processing messages', {
      messages: this._messagesToProcess,
      cursor: this._cursor,
      buffer: this._buffer,
      condition: this._messagesToProcess.map((message) => message.created > this._cursor.timestamp),
    });
    // TODO(mykola): Fix double filtering, effect records old value of cursor.
    const messages = this._messagesToProcess.filter((message) => message.created > this._cursor.timestamp);
    this._messagesToProcess = [];
    if (
      this._lastProcessedMessageIds.length === messages.length &&
      messages.every((message) => this._lastProcessedMessageIds.includes(message.id))
    ) {
      return;
    }
    this._lastProcessedMessageIds = messages.map((message) => message.id);

    try {
      const segments = [
        ...this._buffer,
        ...messages
          .flatMap((message) =>
            message.blocks.map((block) => (block.type === 'transcription' ? block.text : undefined)),
          )
          .filter(isNonNullable),
      ];
      const { sentences } = await asyncTimeout(
        this._functionExecutor.invoke(sentenceNormalization, {
          segments,
        }),
        SENTENCE_TIMEOUT,
      );

      this._state.result.push({ segments, sentences });
      this._buffer = sentences.slice(-1);
      log.info('new buffer', { buffer: this._buffer });
      this._putCursorAfter(messages);
    } catch (error) {
      log.error('error', { error });
      this._putCursorAfter(messages);
    }
  }

  private _putCursorAfter(messages: DataType.Message[]) {
    this._cursor.timestamp = messages[messages.length - 1].created;
  }
}
