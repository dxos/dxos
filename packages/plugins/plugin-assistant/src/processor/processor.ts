//
// Copyright 2025 DXOS.org
//

import { Atom, Registry as AtomRegistry } from '@effect-atom/atom-react';
import * as AiError from '@effect/ai/AiError';
import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import { type AiService, DEFAULT_EDGE_MODEL, type ModelName, type ModelRegistry, type OpaqueToolkit } from '@dxos/ai';
import { Capabilities } from '@dxos/app-framework';
import {
  AiContext,
  AiSession,
  createSystemPrompt,
  formatSystemPrompt,
  McpServerError,
  PartialBlock,
  ToolExecutionServices,
} from '@dxos/assistant';
import { type Chat } from '@dxos/assistant-toolkit';
import { type Credential, Operation, type ServiceNotAvailableError, Trace } from '@dxos/compute';
import { type Database, Feed, Obj, Ref, type Registry } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { AgentService } from '@dxos/functions-runtime';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { AssistantOperation } from '#types';

/**
 * @deprecated Services type for the old direct-conversation processor path.
 * Retained for backward compatibility with CLI and update-name.
 */
export type AiChatServices =
  | Credential.CredentialsService
  | Database.Service
  | AiService.AiService
  | Trace.TraceService;

/**
 * Space-scoped services materialised by the layer passed into
 * {@link AiChatProcessor}. Mirrors the tag list that
 * {@link useChatProcessor} passes to {@link ServiceResolver.provide}.
 */
export type SpaceServices =
  | Database.Service
  | Feed.FeedService
  | Credential.CredentialsService
  | AiService.AiService
  | AgentService.AgentService
  | Registry.Service
  | OpaqueToolkit.OpaqueToolkitProvider;

export type AiChatProcessorOptions = {
  model?: ModelName;
  modelRegistry?: ModelRegistry;
  registry?: Registry.Registry;
  observableRegistry?: AtomRegistry.Registry;
  /**
   * For tracing.
   */
  chat?: Ref.Ref<Chat.Chat>;
  system?: string;
};

const defaultOptions: Partial<AiChatProcessorOptions> = {
  model: DEFAULT_EDGE_MODEL,
};

export type ProcessorRequestOptions = {};

export type ProcessorRequest = {
  message: string;
  options?: ProcessorRequestOptions;
};

/**
 * Maps a failure from the agent fiber to an error suitable for display.
 * {@link AiError}s originate from the AI service and are actionable by the user
 * (e.g., "model 'x' not found", "Connection refused"), so their detail is propagated.
 * Any other failure is treated as an internal/unexpected error and reported generically
 * to avoid leaking implementation detail.
 */
const parseError = (err: unknown): Error => {
  let message: string | undefined;
  if (AiError.isAiError(err)) {
    message = err.description?.trim() || err.message;
  } else if (typeof err === 'string') {
    // TODO(burdon): This is brittle.
    // UnknownError: ChatCompletionsClient.streamText: model 'gemma3:27b' not found
    const [, model] = err.match(/model\s+'([^']+)'\s+not\s+found/i) || [];
    if (model) {
      message = `The model is not available: ${model}`;
    }
  }

  if (!message) {
    message = 'An unexpected error occurred.';
  }

  return new Error(message, { cause: err });
};

/**
 * Handles interactions with the AI service.
 * Uses AgentService to spawn a process-backed agent and subscribes to ephemeral trace events for streaming.
 */
export class AiChatProcessor {
  readonly #registry: AtomRegistry.Registry;

  /** Pending messages (finalized, non-streaming). */
  readonly #pending = Atom.make<Message.Message[]>([]);

  /** Currently streaming messages (from ephemeral trace events). */
  readonly #streaming = Atom.make<Message.Message[]>([]);

  /** Set of message IDs that have been finalized (non-pending delivered via ephemeral). */
  readonly #finalizedIds = new Set<string>();

  /** Currently active request fiber. */
  #requestFiber: Fiber.RuntimeFiber<void, unknown> | undefined;

  /** Last request (for retries). */
  #lastRequest: ProcessorRequest | undefined;

  /** Streaming state. */
  public readonly streaming = Atom.make<boolean>((get) => get(this.#streaming).length > 0);

  /** Active state. */
  public readonly active = Atom.make(false);

  /** Array of Messages (incl. the current message being streamed). */
  public readonly messages = Atom.make<Message.Message[]>((get) => [...get(this.#pending), ...get(this.#streaming)]);

  /** Last error. */
  public readonly error = Atom.make<Option.Option<Error>>(Option.none());

  /**
   * MCP server connection errors observed during the most recent request.
   * Misconfigured/unreachable servers are dropped from the toolkit so the chat
   * keeps working; the entries here let the UI display which servers failed.
   */
  public readonly mcpErrors = Atom.make<readonly Trace.PayloadType<typeof McpServerError>[]>([]);

  constructor(
    private readonly _conversation: AiSession.Session,
    private readonly _runtime: Capabilities.ProcessManagerRuntime,
    private readonly _feed: Feed.Feed,
    /**
     * Pre-built layer that materialises {@link SpaceServices}. Built via
     * {@link ServiceResolver.provide} with the {@link ServiceResolver} already
     * supplied (hence `RIn = never`); the {@link ServiceNotAvailableError}
     * error channel surfaces when a tag is not available for the space.
     * Provided to every effect run by the processor so the underlying
     * {@link ProcessManagerRuntime} has access to space-affinity services.
     */
    private readonly _spaceLayer: Layer.Layer<SpaceServices, ServiceNotAvailableError, never>,
    private readonly _options: AiChatProcessorOptions = defaultOptions,
  ) {
    this.#registry = this._options.observableRegistry ?? AtomRegistry.make();
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

  get registry() {
    return this._options.registry;
  }

  get system(): string {
    return this._options.system ?? '';
  }

  async getTools(): Promise<Record<string, any>> {
    return this._runtime.runPromise(
      Effect.provide(this._conversation.getTools(), ToolExecutionServices).pipe(Effect.provide(this._spaceLayer)),
    );
  }

  async getSystemPrompt(): Promise<string> {
    return this._runtime.runPromise(
      Effect.gen(this, function* () {
        const blueprints = this.context.getBlueprints();
        const objects = this.context.getObjects();
        return yield* formatSystemPrompt({ system: this._options.system, blueprints, objects });
      }).pipe(
        Effect.provideService(AiContext.Service, { binder: this.context }),
        Effect.provide(this._spaceLayer),
        Effect.orDie,
      ),
    );
  }

  /**
   * Initiates a new request via AgentService.
   */
  async request(requestProp: ProcessorRequest): Promise<void> {
    if (this.#requestFiber) {
      await this.cancel();
    }

    try {
      this.#lastRequest = requestProp;
      this.#registry.set(this.error, Option.none());
      this.#registry.set(this.mcpErrors, []);
      this.#registry.set(this.active, true);

      const effect = Effect.gen(this, function* () {
        // NOTE: Gets or creates a session for the feed.
        log.info('init agent session', { feed: Obj.getURI(this._feed), model: this._options.model });
        const session = yield* AgentService.getSession(this._feed, { model: this._options.model });
        const ephemeralStream = session.subscribeEphemeral();
        yield* ephemeralStream.pipe(
          Stream.runForEach((message) =>
            Effect.sync(() => {
              for (const event of message.events) {
                if (Trace.isOfType(PartialBlock, event)) {
                  this.#handleEphemeralMessage(event.data);
                } else if (Trace.isOfType(McpServerError, event)) {
                  this.#handleMcpError(event.data);
                }
              }
            }),
          ),
          Effect.fork,
        );

        log('chat processor submitting prompt', { length: requestProp.message.length });
        yield* session.submitPrompt(requestProp.message);
        log('chat processor submitPrompt returned, waiting for agent', {});

        // On the first message (no name yet), schedule rename immediately so it
        // runs concurrently with the AI response rather than waiting for completion.
        if (!this._options.chat?.target?.name) {
          yield* this.#updateChatName(requestProp.message);
        }

        yield* session.waitForCompletion();
        log.info('session complete');

        this.#flushStreaming();
      });

      this.#requestFiber = this._runtime.runFork(effect.pipe(Effect.provide(this._spaceLayer)));

      // Inspect the fiber's exit so the underlying failure (e.g. "model 'x' not found") is
      // preserved as a clean Error rather than an opaque FiberFailure.
      const exit = await this._runtime.runPromise(Fiber.await(this.#requestFiber));
      if (Exit.isFailure(exit)) {
        if (Cause.isInterruptedOnly(exit.cause)) {
          return;
        }

        throw EffectEx.causeToError(exit.cause);
      }

      this.#registry.set(this.error, Option.none());
      this.#lastRequest = undefined;
      this.#requestFiber = undefined;
    } catch (err) {
      // `EffectEx.causeToError` above unwraps the fiber failure into the underlying error (e.g. an AiError
      // carrying "model 'x' not found"); `parseError` decides what to surface to the user.
      log.error('request failed', { error: err });
      this.#registry.set(this.error, Option.some(parseError(err)));
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
    await EffectEx.runAndForwardErrors(
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
   * Clears the recorded MCP server errors (e.g. after the user dismisses the warning banner).
   */
  dismissMcpErrors(): void {
    this.#registry.set(this.mcpErrors, []);
  }

  /**
   * Update the current chat's name.
   */
  async updateName(chat: Chat.Chat): Promise<void> {
    const spaceId = Obj.getDatabase(chat)?.spaceId;
    if (!spaceId) {
      return;
    }
    EffectEx.unwrapExit(
      await this._runtime.runPromiseExit(
        Operation.invoke(AssistantOperation.UpdateChatName, { chat }, { spaceId }).pipe(
          Effect.provide(this._spaceLayer),
        ),
      ),
    );
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
   * Records a per-server MCP failure, deduped by url+protocol so repeat misconfigurations
   * across turns do not spam the UI.
   */
  #handleMcpError(event: Trace.PayloadType<typeof McpServerError>) {
    log.warn('MCP server error', event);
    this.#registry.update(this.mcpErrors, (errors) => {
      if (errors.some((existing) => existing.url === event.url && existing.protocol === event.protocol)) {
        return errors;
      }
      return [...errors, event];
    });
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
   * Schedule a chat name update as a detached (fire-and-forget) operation.
   * Called automatically on the first message; can also be invoked manually via the toolbar.
   */
  #updateChatName(prompt?: string): Effect.Effect<void, never, Operation.Service> {
    const chat = this._options.chat?.target;
    if (!chat) {
      return Effect.void;
    }

    const spaceId = Obj.getDatabase(chat)?.spaceId;
    if (!spaceId) {
      return Effect.void;
    }

    log.info('scheduling chat name update');
    return Operation.schedule(AssistantOperation.UpdateChatName, { chat, prompt }, { spaceId });
  }
}
