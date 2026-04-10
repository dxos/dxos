//
// Copyright 2025 DXOS.org
//

import { Atom, Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import {
  type AiService,
  DEFAULT_EDGE_MODEL,
  type ModelName,
  type ModelRegistry,
  type ToolExecutionService,
  type ToolResolverService,
} from '@dxos/ai';
import {
  AiContextService,
  type AiConversation,
  createSystemPrompt,
  formatSystemPrompt,
  AgentService,
  PartialBlock,
} from '@dxos/assistant';
import { type Chat } from '@dxos/assistant-toolkit';
import { type Blueprint } from '@dxos/blueprints';
import { type Database, Feed, Obj, Ref } from '@dxos/echo';
import { runAndForwardErrors } from '@dxos/effect';
import {
  Trace,
  type CredentialsService,
  type FunctionInvocationService,
  type QueueService,
  type TracingService,
} from '@dxos/functions';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import type { AutomationCapabilities } from '@dxos/plugin-automation/types';
import { Message } from '@dxos/types';

import { UpdateChatName } from '../operations/definitions';
import { updateName } from './update-name';

/**
 * @deprecated Services type for the old direct-conversation processor path.
 * Retained for backward compatibility with CLI and update-name.
 */
export type AiChatServices =
  | CredentialsService
  | Database.Service
  | QueueService
  | FunctionInvocationService
  | AiService.AiService
  | ToolExecutionService
  | ToolResolverService
  | TracingService
  | Trace.TraceService;

export type AiChatProcessorOptions = {
  model?: ModelName;
  modelRegistry?: ModelRegistry;
  blueprintRegistry?: Blueprint.Registry;
  observableRegistry?: Registry.Registry;
  /**
   * For tracing.
   */
  chat?: Ref.Ref<Chat.Chat>;
  system?: string;
  /**
   * Probability of automatically updating chat name after each request.
   * Chat name is always updated if it has no name.
   * @default 0.1 (10%)
   */
  autoUpdateNameChance?: number;
};

const defaultOptions: Partial<AiChatProcessorOptions> = {
  model: DEFAULT_EDGE_MODEL,
  autoUpdateNameChance: 0.1,
};

export type AiRequestOptions = {};

export type AiRequest = {
  message: string;
  options?: AiRequestOptions;
};

/**
 * Handles interactions with the AI service.
 * Uses AgentService to spawn a process-backed agent and subscribes to ephemeral trace events for streaming.
 */
export class AiChatProcessor {
  readonly #registry: Registry.Registry;

  /** Pending messages (finalized, non-streaming). */
  readonly #pending = Atom.make<Message.Message[]>([]);

  /** Currently streaming messages (from ephemeral trace events). */
  readonly #streaming = Atom.make<Message.Message[]>([]);

  /** Set of message IDs that have been finalized (non-pending delivered via ephemeral). */
  readonly #finalizedIds = new Set<string>();

  /** Currently active request fiber. */
  #requestFiber: Fiber.RuntimeFiber<void, unknown> | undefined;

  /** Last request (for retries). */
  #lastRequest: AiRequest | undefined;

  /** Streaming state. */
  public readonly streaming = Atom.make<boolean>((get) => get(this.#streaming).length > 0);

  /** Active state. */
  public readonly active = Atom.make(false);

  /** Array of Messages (incl. the current message being streamed). */
  public readonly messages = Atom.make<Message.Message[]>((get) => [...get(this.#pending), ...get(this.#streaming)]);

  /** Last error. */
  public readonly error = Atom.make<Option.Option<Error>>(Option.none());

  constructor(
    private readonly _conversation: AiConversation,
    private readonly _runtime: AutomationCapabilities.ComputeRuntime,
    private readonly _feed: Feed.Feed,
    private readonly _options: AiChatProcessorOptions = defaultOptions,
  ) {
    this.#registry = this._options.observableRegistry ?? Registry.make();
    if (this._options.model && !this._options.system) {
      const capabilities = this._options.modelRegistry?.getCapabilities(this._options.model) ?? {};
      this._options.system = createSystemPrompt(capabilities);
    }
  }

  get context() {
    return this._conversation.context;
  }

  get conversation() {
    return this._conversation;
  }

  get blueprintRegistry() {
    return this._options.blueprintRegistry;
  }

  get system(): string {
    return this._options.system ?? '';
  }

  async getTools(): Promise<Record<string, any>> {
    return this._runtime.runPromise(this._conversation.getTools());
  }

  async getSystemPrompt(): Promise<string> {
    return this._runtime.runPromise(
      Effect.gen(this, function* () {
        const blueprints = this.context.getBlueprints();
        const objects = this.context.getObjects();
        return yield* formatSystemPrompt({ system: this._options.system, blueprints, objects });
      }).pipe(Effect.provideService(AiContextService, { binder: this.context }), Effect.orDie),
    );
  }

  /**
   * Initiates a new request via AgentService.
   */
  async request(requestProp: AiRequest): Promise<void> {
    if (this.#requestFiber) {
      await this.cancel();
    }

    try {
      this.#lastRequest = requestProp;
      this.#registry.set(this.error, Option.none());
      this.#registry.set(this.active, true);

      const effect = Effect.gen(this, function* () {
        // NOTE: Gets or creates a session for the feed.
        const session = yield* AgentService.getSession(this._feed);
        const ephemeralStream = session.subscribeEphemeral();
        yield* ephemeralStream.pipe(
          Stream.runForEach((message) =>
            Effect.sync(() => {
              for (const event of message.events) {
                if (Trace.isOfType(PartialBlock, event)) {
                  this.#handleEphemeralMessage(event.data);
                }
              }
            }),
          ),
          Effect.fork,
        );

        log('chat processor submitting prompt', { length: requestProp.message.length });
        yield* session.submitPrompt(requestProp.message);
        log('chat processor submitPrompt returned, waiting for agent', {});
        yield* session.waitForCompletion();
        log.info('session complete');

        this.#flushStreaming();

        yield* this.#maybeUpdateChatName();
      });

      this.#requestFiber = this._runtime.runFork(effect);

      try {
        await this._runtime.runPromise(Fiber.join(this.#requestFiber));
      } catch (err: any) {
        if (err._tag === 'InterruptedException' || err.message?.includes('interrupted')) {
          return;
        }
        throw err;
      }

      this.#registry.set(this.error, Option.none());
      this.#lastRequest = undefined;
      this.#requestFiber = undefined;
    } catch (err) {
      log.error('request failed', { error: err });
      this.#registry.set(this.error, Option.some(new Error('AI service error', { cause: err })));
    } finally {
      log.info('setting active to false');
      this.#registry.set(this.active, false);
      this.#requestFiber = undefined;
    }
  }

  /**
   * Cancels the current request.
   */
  async cancel(): Promise<void> {
    await runAndForwardErrors(
      Effect.gen(this, function* () {
        if (this.#requestFiber) {
          yield* Fiber.interrupt(this.#requestFiber);
        }
      }),
    );

    this.#requestFiber = undefined;
    this.#registry.set(this.active, false);
  }

  /**
   * Retry last failed request.
   */
  async retry(): Promise<void> {
    if (this.#lastRequest) {
      return this.request(this.#lastRequest);
    }
  }

  /**
   * Update the current chat's name.
   */
  async updateName(chat: Chat.Chat): Promise<void> {
    const runtime = await this._runtime.runPromise(Effect.runtime<any>());
    await updateName(runtime, this._conversation, chat, this._options.model);
  }

  /**
   * Handles an ephemeral message from the agent process.
   * Both pending and completed blocks arrive here. Completed blocks are deduped
   * against messages already written to the feed queue to handle the race between
   * ephemeral delivery and feed replication.
   */
  #handleEphemeralMessage(event: Trace.PayloadType<typeof PartialBlock>) {
    const isPending = event.block.pending;
    const message = Obj.make(Message.Message, {
      id: event.messageId,
      created: new Date().toISOString(),
      sender: { role: event.role },
      blocks: [event.block],
    });

    if (isPending) {
      if (this.#finalizedIds.has(event.messageId)) {
        return;
      }
      this.#registry.update(this.#streaming, (streaming) => {
        const idx = streaming.findIndex((existing) => existing.id === event.messageId);
        if (idx >= 0) {
          const updated = [...streaming];
          updated[idx] = message;
          return updated;
        }
        return [...streaming, message];
      });
    } else {
      this.#finalizedIds.add(event.messageId);
      this.#registry.update(this.#streaming, (streaming) => streaming.filter((existing) => existing.id !== message.id));
      this.#registry.update(this.#pending, (pending) => {
        if (pending.some((existing) => existing.id === message.id)) {
          return pending;
        }
        return [...pending, message];
      });
    }
  }

  /**
   * Move remaining streaming messages to pending (called when agent completes).
   */
  #flushStreaming() {
    const remaining = this.#registry.get(this.#streaming);
    if (remaining.length > 0) {
      this.#registry.update(this.#pending, (pending) => [...pending, ...remaining]);
      this.#registry.set(this.#streaming, []);
    }
    this.#finalizedIds.clear();
  }

  /**
   * Conditionally schedule chat name update in detached fork mode.
   * Updates if chat has no name OR based on random chance (default 10%).
   */
  #maybeUpdateChatName(): Effect.Effect<void, never, Operation.Service> {
    const chat = this._options.chat?.target;
    if (!chat) {
      return Effect.void;
    }

    const chance = this._options.autoUpdateNameChance ?? defaultOptions.autoUpdateNameChance ?? 0.1;
    const shouldUpdate = !chat.name || Math.random() < chance;
    if (!shouldUpdate) {
      return Effect.void;
    }

    log('scheduling chat name update', { hasName: !!chat.name, chance });
    return Operation.schedule(UpdateChatName, { chat });
  }
}
