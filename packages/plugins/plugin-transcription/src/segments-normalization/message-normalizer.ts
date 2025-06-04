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
  private _cursor: QueueCursor;
  private _messagesToProcess: DataType.Message[] = [];
  private _normalizationTask?: DeferredTask;
  private _lastProcessedMessageIds?: string[];

  constructor({ functionExecutor, queue, startingCursor }: SegmentsNormalizerParams) {
    log.info('MessageNormalizer constructor', { startingCursor });
    super();
    this._functionExecutor = functionExecutor;
    this._queue = queue;
    this._cursor = startingCursor;
  }

  protected override async _open() {
    this._normalizationTask = new DeferredTask(this._ctx, () => this._processMessages());
    const unsubscribe = effect(() => {
      this._messagesToProcess = this._queue.items.filter((message) => {
        const actorId = getActorId(message.sender);
        return actorId === this._cursor.actorId && message.created >= this._cursor.timestamp;
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
    const messages = this._messagesToProcess;
    const firstMessageTimestamp = new Date(messages[0].created).getTime();
    const messagesToMerge = messages.filter(
      (message) => new Date(message.created).getTime() <= firstMessageTimestamp + SENTENCE_TIMEOUT,
    );
    const isThereMoreMessages = messagesToMerge.length < messages.length;
    const passedTime = Date.now() - firstMessageTimestamp;

    log.info('messages to merge', { messages: messagesToMerge });

    if (
      this._lastProcessedMessageIds &&
      messages.every((messagesToMerge) => this._lastProcessedMessageIds!.includes(messagesToMerge.id))
    ) {
      this._putCursorAfter(messagesToMerge);
      return;
    }

    this._lastProcessedMessageIds = messages.map((message) => message.id);

    try {
      // TODO(mykola): Executor should support timeout.
      const response = await asyncTimeout(
        this._functionExecutor.invoke(sentenceNormalization, {
          segments: messagesToMerge.flatMap((message) =>
            message.blocks.map((block) => (block.type === 'transcription' ? block.text : '')),
          ),
        }),
        PROCESSING_TIMEOUT,
      );

      const shouldWriteBufferToQueue = isThereMoreMessages || passedTime > SENTENCE_TIMEOUT;
      let sentences: string[] = [];
      sentences = response.sentences;

      if (sentences.length > 0) {
        const message = createMessage(sentences, messagesToMerge);
        this._writeMessages(message, messagesToMerge);
      }
    } catch (error) {
      log.error('Failed to normalize segments', { messages, error });
      // If processing failed, emit the segments as is.
      this._putCursorAfter(messagesToMerge);
    }
  }

  private _writeMessages(message: DataType.Message, originalMessages: DataType.Message[]) {
    log.info('writing messages', { message });
    this._cursor.timestamp = originalMessages.at(-1)!.created;
    this._queue.append([message]);
  }

  private _putCursorAfter(messages: DataType.Message[]) {
    this._cursor.timestamp = new Date(new Date(messages.at(-1)!.created).getTime() + 1).toISOString();
  }
}

const createMessage = (sentences: string[], originalMessages: DataType.Message[]) => {
  const message = create(DataType.Message, {
    ...originalMessages[0],
    blocks: [
      {
        pending: true,
        type: 'transcription',
        text: sentences.join(' '),
        started: originalMessages[0].created,
      },
    ],
  });

  getMeta(message).succeeds.push(...originalMessages.flatMap((message) => [message.id, ...getMeta(message).succeeds]));
  return message;
};
