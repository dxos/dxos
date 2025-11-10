//
// Copyright 2025 DXOS.org
//

//
// Copyright 2025 DXOS.org
//

import { effect } from '@preact/signals-core';

import { DeferredTask, asyncTimeout } from '@dxos/async';
import { LifecycleState, Resource } from '@dxos/context';
import { type Queue } from '@dxos/echo-db';
import { type FunctionExecutor } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { type DataType } from '@dxos/schema';

import { type MessageWithRangeId, type NormalizationOutput, sentenceNormalization } from './normalization';
import { getActorId } from './utils';

const PROCESSING_TIMEOUT = 20_000; // ms
const MAX_RANGE_ID_COUNT = 10;

export type SegmentsNormalizerParams = {
  functionExecutor: FunctionExecutor;
  queue: Queue<DataType.Message.Message>;
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
  private _queue: Queue<DataType.Message.Message>;
  private _cursor: QueueCursor;
  private _messagesToProcess: MessageWithRangeId[] = [];
  private _normalizationTask?: DeferredTask;
  private _lastProcessedMessageIds?: string[];

  constructor({ functionExecutor, queue, startingCursor }: SegmentsNormalizerParams) {
    super();
    this._functionExecutor = functionExecutor;
    this._queue = queue;
    this._cursor = startingCursor;
  }

  protected override async _open(): Promise<void> {
    this._normalizationTask = new DeferredTask(this._ctx, () => this._processMessages());
    const unsubscribe = effect(() => {
      if (this._lifecycleState !== LifecycleState.OPEN) {
        return;
      }

      this._messagesToProcess = this._queue.objects.filter((message) => {
        const actorId = getActorId(message.sender);
        return actorId === this._cursor.actorId && message.created >= this._cursor.timestamp;
      });

      this._normalizationTask!.schedule();
    });
    this._ctx.onDispose(() => unsubscribe());
  }

  // Need to unpack strings from blocks from messages run them through the function and then pack them back into blocks into messages.
  private async _processMessages(): Promise<void> {
    const messages = this._messagesToProcess;
    this._messagesToProcess = [];
    if (
      this._lastProcessedMessageIds &&
      messages.every((message) => this._lastProcessedMessageIds!.includes(message.id))
    ) {
      return;
    }

    this._lastProcessedMessageIds = messages.map((message) => message.id);

    try {
      // TODO(mykola): Executor should support timeout.
      const response: NormalizationOutput = await asyncTimeout(
        this._functionExecutor.invoke(sentenceNormalization, { messages }),
        PROCESSING_TIMEOUT,
      );

      this._writeMessages(response.sentences);
      this._lastProcessedMessageIds.push(...response.sentences.map((sentence) => sentence.id));
      if (response.sentences.length === 1 && response.sentences.at(-1)!.rangeId!.length > MAX_RANGE_ID_COUNT) {
        log.warn('Sentence is too long', { messages });
        this._cursor.timestamp = new Date(new Date(response.sentences[0].created).getTime() + 1).toISOString();
      }
    } catch {
      log.error('Failed to normalize segments', { messages });
      // If processing failed, emit the segments as is.
      this._writeMessages(messages);
    }
  }

  private _writeMessages(messages: MessageWithRangeId[]): void {
    log.info('writing messages', { messages });
    const lastMessage = messages[messages.length - 1];
    this._cursor.timestamp = lastMessage.created;
    void this._queue.append(messages);
  }
}
