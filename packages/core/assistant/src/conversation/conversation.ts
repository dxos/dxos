//
// Copyright 2025 DXOS.org
//

import type * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Blueprint } from '@dxos/blueprints';
import { Resource } from '@dxos/context';
import { Database, Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
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

export interface AiConversationRunParams {
  prompt: string;
  system?: string;
  observer?: GenerationObserver;
}

/**
 * Durable conversation state (initiated by users and agents) backed by a Queue.
 * Executes tools based on AI responses and supports cancellation of in-progress requests.
 */
export class AiConversation extends Resource {
  /**
   * Message and binding queue.
   */
  private readonly _queue: Queue<Message.Message | ContextBinding>;

  /**
   * Blueprints bound to the conversation.
   */
  private readonly _context: AiContextBinder;

  /**
   * Toolkit from the current session request.
   */
  private readonly _toolkit?: Toolkit.Any;

  /**
   * Blueprints bound to the conversation.
   */
  private _blueprints: readonly Blueprint.Blueprint[] = [];

  public constructor(queue: Queue<Message.Message | ContextBinding>, toolkit?: Toolkit.Any) {
    super();
    this._queue = queue;
    this._context = new AiContextBinder(this._queue);
    this._toolkit = toolkit;
  }

  protected override async _open(): Promise<void> {
    // TODO(wittjosiah): Pass in parent context?
    await this._context.open();
    const context = await this._context.query();
    this._blueprints = await Effect.runPromise(
      Effect.forEach(context.blueprints.values(), Database.Service.loadOption).pipe(
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      ),
    );
  }

  protected override async _close(): Promise<void> {
    await this._context.close();
  }

  public get queue() {
    return this._queue;
  }

  public get context() {
    return this._context;
  }

  public get toolkit() {
    return this._toolkit;
  }

  public get blueprints() {
    return this._blueprints;
  }

  public async getHistory(): Promise<Message.Message[]> {
    const queueItems = await this._queue.queryObjects();
    return queueItems.filter(Obj.instanceOf(Message.Message));
  }

  /**
   * Creates a new cancelable request effect.
   */
  public createRequest(
    params: AiConversationRunParams,
  ): Effect.Effect<Message.Message[], AiSessionRunError, AiSessionRunRequirements> {
    const self = this;
    return Effect.gen(function* () {
      const session = new AiSession();
      const history = yield* Effect.promise(() => self.getHistory());

      // Get context objects.
      const context = yield* Effect.promise(() => self.context.query());
      // const blueprints = yield* Effect.forEach(context.blueprints.values(), Database.Service.loadOption).pipe(
      //   Effect.map(Array.filter(Option.isSome)),
      //   Effect.map(Array.map((option) => option.value)),
      // );

      // Create toolkit.
      const toolkit = yield* createToolkit({
        toolkit: self._toolkit,
        blueprints: self._blueprints,
      });

      // Context objects.
      const objects = yield* Effect.forEach(context.objects.values(), Database.Service.loadOption).pipe(
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      );

      const start = Date.now();
      log.info('run', {
        history: history.length,
        blueprints: self._blueprints.length,
        objects: objects.length,
        tools: Object.keys(toolkit.tools).length,
      });

      // Process request.
      const messages = yield* session.run({ history, blueprints: self._blueprints, toolkit, objects, ...params }).pipe(
        Effect.provideService(AiContextService, {
          binder: self.context,
        }),
      );

      log.info('result', { messages: messages.length, duration: Date.now() - start });

      // Append to queue.
      yield* Effect.promise(() => self._queue.append(messages));
      return messages;
    });
  }
}
