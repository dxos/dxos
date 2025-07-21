//
// Copyright 2025 DXOS.org
//

import { type AiInputPreprocessingError } from '@dxos/ai';
import { Event } from '@dxos/async';
import { Obj, Ref } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { DatabaseService, type ServiceContainer } from '@dxos/functions';

import { DataType } from '@dxos/schema';
import type { AiError, AiLanguageModel, AiTool, AiToolkit } from '@effect/ai';
import { Effect } from 'effect';
import { ContextBinder, type ContextBinding } from '../context';
import type { AiAssistantError } from '../errors';
import { AISession } from '../session';

export interface ConversationRunOptions<Tools extends AiTool.Any> {
  systemPrompt?: string;
  prompt: string;

  toolkit: AiToolkit.ToHandler<Tools>;
}

export type ConversationOptions = {
  serviceContainer: ServiceContainer;
  queue: Queue<DataType.Message | ContextBinding>;
};

/**
 * Persistent conversation state.
 * Context + history + artifacts.
 * Backed by a Queue.
 */
export class Conversation {
  private readonly _serviceContainer: ServiceContainer;
  private readonly _queue: Queue<DataType.Message | ContextBinding>;

  /**
   * Fired when the execution loop begins.
   * This is called before the first message is sent.
   */
  public readonly onBegin = new Event<AISession>();

  /**
   * Blueprints bound to the conversation.
   */
  public readonly context: ContextBinder;

  constructor(options: ConversationOptions) {
    this._serviceContainer = options.serviceContainer;
    this._queue = options.queue;
    this.context = new ContextBinder(this._queue);
  }

  run: <Tools extends AiTool.Any>(
    options: ConversationRunOptions<Tools>,
  ) => Effect.Effect<
    DataType.Message[],
    AiAssistantError | AiInputPreprocessingError | AiError.AiError,
    AiLanguageModel.AiLanguageModel
  > = (options) =>
    Effect.gen(this, function* () {
      const session = new AISession();
      this.onBegin.emit(session);
      const history = yield* Effect.promise(() => this.getHistory());
      const context = yield* Effect.promise(() => this.context.query());
      const blueprints = yield* Effect.forEach(context.blueprints.values(), DatabaseService.loadRef);
      if (blueprints.length > 1) {
        throw new Error('Multiple blueprints are not yet supported.');
      }

      // TODO(dmaretskyi): Blueprint instructions + tools.
      const messages = yield* session.run({
        prompt: options.prompt,
        history,
        toolkit: options.toolkit,
        // systemPrompt: (options.systemPrompt ?? '') + (blueprints.at(0)?.instructions ?? ''),
        // // TODO(dmaretskyi): Artifacts come from the blueprint.
        // artifacts: options.artifacts ?? [],
        // tools: blueprints.at(0)?.tools ?? [],
      });
      yield* Effect.promise(() => this._queue.append(messages));
      return messages;
    }).pipe(Effect.withSpan('Conversation.run'));

  async getHistory(): Promise<DataType.Message[]> {
    const queueItems = await this._queue.queryObjects();
    return queueItems.filter(Obj.instanceOf(DataType.Message));
  }
}
