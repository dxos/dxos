//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import type { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { Resource } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import {
  AiSession,
  type AiSessionRunError,
  type AiSessionRunRequirements,
  type GenerationObserver,
  createToolkit,
} from '../session';

import { AiContextBinder, AiContextService, type ContextBinding } from './context';

export interface AiConversationRunProps {
  prompt: string;
  system?: string;
  observer?: GenerationObserver;
}

export type AiConversationOptions = {
  queue: Queue<Message.Message | ContextBinding>;
  toolkit?: Toolkit.Any;
  registry?: Registry.Registry;
};

/**
 * Durable conversation state (initiated by users and agents) backed by a Queue.
 * Executes tools based on AI responses and supports cancellation of in-progress requests.
 */
export class AiConversation extends Resource {
  /**
   * Blueprints and objects bound to the conversation.
   */
  private readonly _binder: AiContextBinder;
  private readonly _queue: Queue<Message.Message | ContextBinding>;
  private readonly _toolkit?: Toolkit.Any;

  public constructor(options: AiConversationOptions) {
    super();
    this._queue = options.queue;
    this._toolkit = options.toolkit;
    invariant(this._queue);
    this._binder = new AiContextBinder({ queue: this._queue, registry: options.registry });
  }

  protected override async _open(): Promise<void> {
    await this._binder.open(this._ctx);
  }

  public get queue() {
    return this._queue;
  }

  public get context() {
    return this._binder;
  }

  public get toolkit() {
    return this._toolkit;
  }

  public async getHistory(): Promise<Message.Message[]> {
    const queueItems = await this._queue.queryObjects(); // TODO(burdon): Update.
    return queueItems.filter(Obj.instanceOf(Message.Message));
  }

  getTools(): Effect.Effect<Record<string, Tool.Any>, never, ToolExecutionService | ToolResolverService> {
    return Effect.gen(this, function* () {
      const blueprints = this.context.getBlueprints();
      const tookit = yield* createToolkit({ toolkit: this._toolkit, blueprints });
      return tookit.tools;
    }).pipe(Effect.orDie);
  }

  /**
   * Creates a new cancelable request effect.
   */
  public createRequest(
    params: AiConversationRunProps,
  ): Effect.Effect<Message.Message[], AiSessionRunError, AiSessionRunRequirements> {
    return Effect.gen(this, function* () {
      const history = yield* Effect.promise(() => this.getHistory());

      // Create toolkit.
      const blueprints = this.context.getBlueprints();
      const toolkit = yield* createToolkit({
        toolkit: this._toolkit,
        blueprints,
      });

      // Context objects.
      const objects = this.context.getObjects();

      log('run', {
        history: history.length,
        blueprints: blueprints.length,
        tools: Object.keys(toolkit.tools).length,
        objects: objects.length,
      });

      // Process request.
      const session = new AiSession();
      const messages = yield* session.run({ history, blueprints, toolkit, objects, ...params }).pipe(
        Effect.provideService(AiContextService, {
          binder: this.context,
        }),
      );

      log('result', {
        messages: messages.length,
        duration: session.duration,
        toolCalls: session.toolCalls,
      });

      // Append to queue.
      yield* Effect.promise(() => this._queue.append(messages));
      return messages;
    });
  }
}
