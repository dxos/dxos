//
// Copyright 2025 DXOS.org
//

import type * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import type { Registry } from '@effect-atom/atom-react';
import * as Array from 'effect/Array';
import * as Context from 'effect/Context';
import * as Effect from 'effect/Effect';
import * as Either from 'effect/Either';
import { pipe } from 'effect/Function';
import * as Layer from 'effect/Layer';

import { type ToolExecutionService, type ToolResolverService } from '@dxos/ai';
import { type GenericToolkit } from '@dxos/ai';
import { type Blueprint } from '@dxos/blueprints';
import { Resource } from '@dxos/context';
import { Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { acquireReleaseResource } from '@dxos/effect';
import { QueueService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { McpToolkit } from '@dxos/mcp-client';
import { Message } from '@dxos/types';

import {
  AiSession,
  type AiSessionRunError,
  type AiSessionRunRequirements,
  type GenerationObserver,
  createToolkit,
  formatSystemPrompt,
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

// TODO(dmaretskyi): Take from model characteristics. opus has 200k max tokens.
/**
 * Summarization threshold in tokens.
 */
const SUMMARY_THRESHOLD = 80_000;

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
      const blueprints = this.context.getBlueprints();
      const objects = this.context.getObjects();

      log('run', {
        history: history.length,
        blueprints: blueprints.length,
        objects: objects.length,
      });

      const session = new AiSession({
        summarizationThreshold: SUMMARY_THRESHOLD,
        observer: params.observer,
        onOutput: (message) => Effect.promise(() => this._queue.append([message])),
      });

      yield* session.begin({
        history,
        blueprints,
        objects,
        prompt: params.prompt,
        system: params.system,
      });

      // Turn loop: recompute toolkit and system prompt between turns to pick up dynamically enabled blueprints.
      do {
        const currentBlueprints = this.context.getBlueprints();
        const mcps = yield* connectMcpServers(currentBlueprints);
        const toolkit = yield* createToolkit({
          toolkit: this._toolkit,
          blueprints: currentBlueprints,
          genericToolkits: mcps,
        });
        const system = yield* formatSystemPrompt({
          system: params.system,
          blueprints: currentBlueprints,
          objects: this.context.getObjects(),
        }).pipe(Effect.orDie);

        const { done } = yield* session.runTurn({
          system,
          toolkit,
        });

        if (done) {
          break;
        }
      } while (true);

      log('result', {
        messages: session.pending.length,
        duration: session.duration,
        toolCalls: session.toolCalls,
      });

      return [...session.pending];
    }).pipe(
      Effect.provide(
        Layer.mergeAll(
          Layer.succeed(AiContextService, {
            binder: this.context,
          }),
          Layer.succeed(AiConversationService, this),
        ),
      ),
    );
  }
}

/**
 * Gives access to the ai conversation.
 */
export class AiConversationService extends Context.Tag('@dxos/assistant/AiConversationService')<
  AiConversationService,
  AiConversation
>() {
  /**
   * Create a new conversation layer from options.
   */
  static layer = (options: AiConversationOptions): Layer.Layer<AiConversationService | AiContextService> =>
    aiContextFromConversation.pipe(
      Layer.provideMerge(
        Layer.scoped(
          AiConversationService,
          Effect.gen(function* () {
            const conversation = yield* acquireReleaseResource(() => new AiConversation(options));
            return conversation;
          }),
        ),
      ),
    );

  /**
   * Create a new conversation with a new queue.
   */
  static layerNewQueue = (
    options?: Omit<AiConversationOptions, 'queue'>,
  ): Layer.Layer<AiConversationService | AiContextService, never, QueueService> =>
    Layer.unwrapScoped(
      Effect.gen(function* () {
        return AiConversationService.layer({
          ...options,
          queue: yield* QueueService.createQueue<Message.Message | ContextBinding>(),
        });
      }),
    );

  /**
   * Run a prompt in the current conversation.
   */
  static run = (
    params: AiConversationRunProps,
  ): Effect.Effect<Message.Message[], AiSessionRunError, AiSessionRunRequirements | AiConversationService> =>
    Effect.gen(function* () {
      const conversation = yield* AiConversationService;
      return yield* conversation.createRequest(params);
    });
}

const aiContextFromConversation = Layer.effect(
  AiContextService,
  Effect.gen(function* () {
    const conversation = yield* AiConversationService;
    return {
      binder: conversation.context,
    };
  }),
);

const connectMcpServers = (
  blueprints: readonly Blueprint.Blueprint[],
): Effect.Effect<GenericToolkit.GenericToolkit[]> =>
  pipe(
    blueprints,
    Array.flatMap((_) => _.mcpServers ?? []),
    Effect.forEach(({ url, protocol }) =>
      McpToolkit.make({ url, kind: protocol }).pipe(
        // NOTE: Type-inference fails here without explicit void return.
        Effect.tap((toolkit): void =>
          log.info('Connected to MCP server', { url, tools: Object.keys(toolkit.toolkit.tools).length }),
        ),
        Effect.tapDefect((error) => Effect.sync(() => log.warn('Failed to connect to MCP server', { error }))),
        Effect.either,
      ),
    ),
    Effect.map(Array.filterMap((_) => Either.getRight(_))),
  );
