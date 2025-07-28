//
// Copyright 2025 DXOS.org
//

import { type AiError, type AiLanguageModel, type AiTool, AiToolkit } from '@effect/ai';
import { Array, Effect, pipe, type Context, String } from 'effect';

import {
  ToolExecutionService,
  ToolResolverService,
  type AiInputPreprocessingError,
  type AiToolNotFoundError,
} from '@dxos/ai';
import { Event } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { DatabaseService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { ContextBinder, type ContextBinding } from '../context';
import type { AiAssistantError } from '../errors';
import { AiSession } from '../session';

export interface ConversationRunOptions<Tools extends AiTool.Any> {
  systemPrompt?: string;
  prompt: string;

  toolkit?: AiToolkit.AiToolkit<Tools>;
}

export type ConversationOptions = {
  queue: Queue<DataType.Message | ContextBinding>;
};

/**
 * Persistent conversation state.
 * Context + history + artifacts.
 * Backed by a Queue.
 */
export class Conversation {
  private readonly _queue: Queue<DataType.Message | ContextBinding>;

  /**
   * Fired when the execution loop begins.
   * This is called before the first message is sent.
   */
  public readonly onBegin = new Event<AiSession>();

  /**
   * Blueprints bound to the conversation.
   */
  public readonly context: ContextBinder;

  constructor(options: ConversationOptions) {
    this._queue = options.queue;
    this.context = new ContextBinder(this._queue);
  }

  async getHistory(): Promise<DataType.Message[]> {
    const queueItems = await this._queue.queryObjects();
    return queueItems.filter(Obj.instanceOf(DataType.Message));
  }

  run = <Tools extends AiTool.Any>(
    options: ConversationRunOptions<Tools>,
  ): Effect.Effect<
    DataType.Message[],
    AiAssistantError | AiInputPreprocessingError | AiError.AiError | AiToolNotFoundError,
    AiLanguageModel.AiLanguageModel | ToolResolverService | ToolExecutionService | AiTool.ToHandler<Tools>
  > =>
    Effect.gen(this, function* () {
      const session = new AiSession();
      this.onBegin.emit(session);

      const history = yield* Effect.promise(() => this.getHistory());
      const context = yield* Effect.promise(() => this.context.query());
      const blueprints = yield* Effect.forEach(context.blueprints.values(), DatabaseService.loadRef);

      const blueprintToolkit = yield* ToolResolverService.resolveToolkit(blueprints.flatMap((bp) => bp.tools));
      const blueprintToolkitHandler: Context.Context<AiTool.ToHandler<AiTool.Any>> = yield* blueprintToolkit.toContext(
        yield* ToolExecutionService.handlersFor(blueprintToolkit),
      );
      const toolkit = options.toolkit != null ? AiToolkit.merge(options.toolkit, blueprintToolkit) : blueprintToolkit;
      const toolkitWithBlueprintHandlers = yield* toolkit.pipe(
        Effect.provide(blueprintToolkitHandler) as any,
      ) as Effect.Effect<AiToolkit.ToHandler<any>, never, AiTool.ToHandler<Tools>>;

      // Build system prompt from blueprint templates.
      const systemPrompt = yield* pipe(
        blueprints,
        Effect.forEach((blueprint) => DatabaseService.loadRef(blueprint.instructions)),
        Effect.flatMap(Effect.forEach((template) => DatabaseService.loadRef(template.source))),
        Effect.map(Array.map((template) => `\n\n<blueprint>${template.content}</blueprint>`)),
        Effect.map(Array.reduce(options.systemPrompt ?? '', String.concat)),
      );

      log.info('run', {
        systemPrompt: [systemPrompt.slice(0, 32), '...', systemPrompt.slice(-32), systemPrompt.length].join(' '),
      });

      const messages = yield* session.run({
        prompt: options.prompt,
        history,
        toolkit: toolkitWithBlueprintHandlers,
        systemPrompt,
      });
      yield* Effect.promise(() => this._queue.append(messages));
      return messages;
    }).pipe(Effect.withSpan('Conversation.run'));
}
