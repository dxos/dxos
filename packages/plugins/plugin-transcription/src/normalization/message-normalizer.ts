//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import type * as Runtime from 'effect/Runtime';

import { DeferredTask, asyncTimeout } from '@dxos/async';
import { LifecycleState, Resource } from '@dxos/context';
import { Database, Feed, Filter } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { type FunctionExecutor } from '@dxos/compute-runtime';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { type MessageWithRangeId, type NormalizationOutput, sentenceNormalization } from './normalization';
import { getActorId } from './utils';

const PROCESSING_TIMEOUT = 20_000; // ms
const MAX_RANGE_ID_COUNT = 10;

export type SegmentsNormalizerProps = {
  functionExecutor: FunctionExecutor;
  feed: Feed.Feed;
  feedRuntime: Runtime.Runtime<Database.Service>;
  startingCursor: QueueCursor;
};

// TODO(mykola): Use generic queue cursor from @dxos/protocols.
export type QueueCursor = {
  actorId: string;
  timestamp: string;
};

export class MessageNormalizer extends Resource {
  private readonly _functionExecutor: FunctionExecutor;

  private _feed: Feed.Feed;
  private _feedRuntime: Runtime.Runtime<Database.Service>;
  private _cursor: QueueCursor;
  private _messagesToProcess: MessageWithRangeId[] = [];
  private _normalizationTask?: DeferredTask;
  private _lastProcessedMessageIds?: string[];

  constructor({ functionExecutor, feed, feedRuntime, startingCursor }: SegmentsNormalizerProps) {
    super();
    this._functionExecutor = functionExecutor;
    this._feed = feed;
    this._feedRuntime = feedRuntime;
    this._cursor = startingCursor;
  }

  protected override async _open(): Promise<void> {
    this._normalizationTask = new DeferredTask(this._ctx, () => this._processMessages());

    const queryResult = await Feed.query(this._feed, Filter.type(Message.Message)).pipe(
      Effect.provide(this._feedRuntime),
      EffectEx.runAndForwardErrors,
    );

    const updateMessages = () => {
      if (this._lifecycleState !== LifecycleState.OPEN) {
        return;
      }

      this._messagesToProcess = (queryResult.results as Message.Message[]).filter((message) => {
        const actorId = getActorId(message.sender);
        return actorId === this._cursor.actorId && message.created >= this._cursor.timestamp;
      });

      this._normalizationTask!.schedule();
    };

    // Initial update.
    updateMessages();

    // Subscribe to feed changes.
    const unsubscribe = queryResult.subscribe(updateMessages);
    this._ctx.onDispose(unsubscribe);
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

      await this._writeMessages(response.sentences);
      this._lastProcessedMessageIds.push(...response.sentences.map((sentence) => sentence.id));
      if (response.sentences.length === 1 && response.sentences.at(-1)!.rangeId!.length > MAX_RANGE_ID_COUNT) {
        log.warn('Sentence is too long', { messages });
        this._cursor.timestamp = new Date(new Date(response.sentences[0].created).getTime() + 1).toISOString();
      }
    } catch {
      log.error('Failed to normalize segments', { messages });
      // If processing failed, emit the segments as is.
      await this._writeMessages(messages);
    }
  }

  private async _writeMessages(messages: MessageWithRangeId[]): Promise<void> {
    log.info('writing messages', { messages });
    const lastMessage = messages[messages.length - 1];
    this._cursor.timestamp = lastMessage.created;
    await Feed.append(this._feed, messages).pipe(Effect.provide(this._feedRuntime), EffectEx.runAndForwardErrors);
  }
}
