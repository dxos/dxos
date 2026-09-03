//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import * as AiError from 'effect/unstable/ai/AiError';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';

import { AiModelNotAvailableError, type AiService, Model, type OpaqueToolkit } from '@dxos/ai';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import {
  AiContext,
  AiSession,
  Harness,
  McpServerError,
  PartialBlock,
  RequestPhase,
  ToolExecutionServices,
  createSystemPrompt,
  formatSystemPrompt,
} from '@dxos/assistant';
import type * as Chat from '@dxos/assistant/Chat';
import { type ServiceNotAvailableError } from '@dxos/compute';
import * as AgentService from '@dxos/compute/AgentService';
import type * as Credential from '@dxos/compute/Credential';
import type * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import * as Trace from '@dxos/compute/Trace';
import { Database, Feed, Obj, Ref, type Registry } from '@dxos/echo';
import { UsageQuotaExceededError } from '@dxos/edge-client';
import { EffectEx } from '@dxos/effect';
import { DXN } from '@dxos/keys';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { AssistantOperation } from '#types';

import { findInCause } from '../util/error-cause';
import { type ProcessorRequestContext, createPromptContent } from './prompt';

/**
 * Space-scoped services materialised by the layer passed into
 * {@link AiChatProcessor}. Mirrors the tag list that
 * {@link useChatProcessor} passes to {@link ServiceResolver.provide}.
 */
export type SpaceServices =
  | Database.Service
  | Credential.CredentialsService
  | AiService.AiService
  | AgentService.AgentService
  | Registry.Service
  | OpaqueToolkit.OpaqueToolkitProvider;

export type AiChatProcessorOptions = {
  model?: DXN.DXN;
  // The selected provider, carried with the model so the agent process resolves the (provider, id)
  // pair — the catalog's shared model ids are ambiguous without it.
  provider?: DXN.DXN;
  modelRegistry?: Model.Registry;
  registry?: Registry.Registry;
  observableRegistry?: AtomRegistry.AtomRegistry;
  /**
   * For tracing.
   */
  chat?: Ref.Ref<Chat.Chat>;
  system?: string;
};

const defaultOptions: Partial<AiChatProcessorOptions> = {
  model: Model.DEFAULT_EDGE,
};

export type ProcessorRequestOptions = {};

export type ProcessorRequest = {
  message: string;
  /** Ephemeral context (e.g. companion-document selection) captured at submit time. */
  context?: ProcessorRequestContext;
  options?: ProcessorRequestOptions;
};

/** User-facing message shown when an AI request is rejected for exceeding the account usage quota (HTTP 429). */
const QUOTA_EXCEEDED_MESSAGE = 'You have reached your AI usage limit for this period.';

/** An actionable next-step a chat error surfaces in its toast; the label key is resolved by the chat UI. */
export type ChatErrorAction = { readonly labelKey: string };

/**
 * Display error for an over-quota (HTTP 429) rejection. Declares an {@link action} so the chat toast can
 * offer a usage-dashboard link declaratively — the UI renders whatever action an error declares rather
 * than branching on the error type.
 */
export class AiUsageQuotaError extends Error {
  readonly action: ChatErrorAction = { labelKey: 'view-usage.label' };
}

/**
 * Matches an over-quota rejection (EDGE responds 429) in error text. The typed
 * {@link UsageQuotaExceededError} is wrapped deep in the cause chain and does not survive the
 * agent-process boundary — the failure is rendered to a string via `Cause.pretty`, which drops
 * nested causes — so detection also relies on the HTTP 429 that `@effect/ai`'s
 * {@link AiError.HttpResponseError} embeds in its message (e.g. "... (429 POST ...").
 */
const QUOTA_PATTERN = /\b429\b|rate.?limit|too many requests|usage quota|quota exceeded/i;

/** Whether an error denotes an over-quota (HTTP 429) rejection, detected by typed status or message text. */
const isQuotaError = (err: unknown): boolean => {
  if (AiError.isAiError(err)) {
    // v4 classifies the failure semantically on `reason` rather than by status; these are the two
    // shapes a 429 arrives as.
    if (err.reason._tag === 'RateLimitError' || err.reason._tag === 'QuotaExhaustedError') {
      return true;
    }
    return QUOTA_PATTERN.test(describeAiError(err));
  }
  return typeof err === 'string' && QUOTA_PATTERN.test(err);
};

/** `description` is declared on only some reason variants; the wrapper's `message` is the fallback. */
const describeAiError = (err: AiError.AiError): string =>
  ('description' in err.reason ? err.reason.description : undefined) ?? err.message;

/**
 * Matches an {@link AiModelNotAvailableError} in error text. Like the quota case, the typed error
 * does not always survive the agent-process boundary — the failure is rendered with `Cause.pretty`,
 * which drops nested causes — so detection also reads the message it stringifies to.
 */
const MODEL_UNAVAILABLE_PATTERN = /AI Model not available:\s*(\S+?):?(?=\s|$)/i;

/** The displayable text of a failure, which reaches the chat either typed or already stringified. */
const errorText = (err: unknown): string => (typeof err === 'string' ? err : err instanceof Error ? err.message : '');

/** The model of a model-unavailable rejection, by typed context or message text. */
const unavailableModel = (err: unknown): string | undefined => {
  const typed = findInCause(err, AiModelNotAvailableError.is);
  if (typed) {
    return String(typed.context.model);
  }
  return errorText(err).match(MODEL_UNAVAILABLE_PATTERN)?.[1];
};

/**
 * Maps a failure from the agent fiber to an error suitable for display.
 * An over-quota (HTTP 429) rejection is surfaced as an actionable usage-limit message; the typed
 * {@link UsageQuotaExceededError} only survives on the direct path, so {@link isQuotaError} also
 * recognizes the stringified 429 the chat receives across the agent-process boundary.
 * A model the configured provider does not serve names that model, since the fix is to pick another
 * one in settings.
 * Other {@link AiError}s originate from the AI service and are actionable by the user
 * (e.g., "model 'x' not found", "Connection refused"), so their detail is propagated.
 * Any other failure is treated as an internal/unexpected error and reported generically
 * to avoid leaking implementation detail.
 */
export const parseError = (err: unknown): Error => {
  const quotaError = findInCause(err, UsageQuotaExceededError.is);
  if (quotaError || isQuotaError(err)) {
    return new AiUsageQuotaError(quotaError?.message?.trim() || QUOTA_EXCEEDED_MESSAGE, { cause: err });
  }

  const model = unavailableModel(err);
  if (model) {
    return new Error(`The model is not available: ${model}`, { cause: err });
  }

  let message: string | undefined;
  if (AiError.isAiError(err)) {
    message = describeAiError(err).trim();
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
  readonly #registry: AtomRegistry.AtomRegistry;

  /** Pending messages (finalized, non-streaming). */
  readonly #pending = Atom.make<Message.Message[]>([]);

  /** Currently streaming messages (from ephemeral trace events). */
  readonly #streaming = Atom.make<Message.Message[]>([]);

  /** Set of message IDs that have been finalized (non-pending delivered via ephemeral). */
  readonly #finalizedIds = new Set<string>();

  /** Currently active request fiber. */
  #requestFiber: Fiber.Fiber<void, unknown> | undefined;

  /** Fiber following a turn this processor did not issue ({@link adopt}). */
  #observeFiber: Fiber.Fiber<void, unknown> | undefined;

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

  /**
   * Setup stage the in-flight request has reached, or `undefined` when there is nothing to report.
   *
   * Only meaningful while the reader is still waiting: the first streamed block clears it, since the
   * reply itself is a better progress report than any phase label.
   */
  public readonly activity = Atom.make<Trace.PayloadType<typeof RequestPhase> | undefined>(undefined);

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

  get context(): AiContext.Binder {
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
      Effect.gen({ self: this }, function* () {
        const skills = this.context.getSkills();
        const objects = this.context.getObjects();
        const instructions = yield* this.#getInstructions();
        // Tier A only: system-prompt formatting runs operations that read the conversation context;
        // the live-host Tier B control surface is not reachable from this fiber.
        const runtime = yield* Effect.context<Database.Service>();
        return yield* formatSystemPrompt({ system: this._options.system, skills, objects, instructions }).pipe(
          Effect.provideService(
            Harness.HarnessService,
            Harness.fromBinder({ feed: this._feed, runtime, binder: this.context }),
          ),
        );
      }).pipe(Effect.provide(this._spaceLayer), Effect.orDie),
    );
  }

  /**
   * Resolves the chat's steering instructions, if any — the local `AiSession` used for system-prompt
   * formatting is feed-centric, so the ref is resolved here and handed down.
   */
  #getInstructions(): Effect.Effect<Instructions.Instructions[], never, Database.Service> {
    return Effect.gen({ self: this }, function* () {
      const instructionsRef = this._options.chat?.target?.instructions;
      if (!instructionsRef) {
        return [];
      }

      const instructions = yield* Database.load(instructionsRef).pipe(Effect.orElseSucceed(() => undefined));
      return instructions ? [instructions] : [];
    });
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
      // Set locally: spawning or attaching the agent process happens before it can emit anything, and
      // that resolve is itself part of the wait the reader is watching.
      this.#registry.set(this.activity, { phase: 'starting' });
      this.#registry.set(this.active, true);

      const effect = Effect.gen({ self: this }, function* () {
        // NOTE: Gets or creates a session for the feed.
        log.info('init agent session', {
          feed: Obj.getURI(this._feed),
          model: this._options.model,
          provider: this._options.provider,
        });
        const session = yield* this.#getSession();
        yield* this.#forkEphemeralCollector(session);

        log('chat processor submitting prompt', { length: requestProp.message.length });
        yield* session.submitPrompt(createPromptContent(requestProp));
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
        if (Cause.hasInterruptsOnly(exit.cause)) {
          this.#discardStreaming();
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
      this.#registry.set(this.activity, undefined);
      this.#requestFiber = undefined;
    }
  }

  /**
   * Queues a prompt behind the turn already running, instead of starting one.
   *
   * The agent's input queue is feed state, so submitting is durable and ordered: the running turn is
   * left alone and the process takes this prompt up when it settles. {@link request} cannot serve
   * this case — it cancels the in-flight turn to start its own — and the running request's
   * `waitForCompletion` already covers the queued turn, since the agent does not report completion
   * while its queue is non-empty.
   */
  async enqueue(requestProp: ProcessorRequest): Promise<void> {
    try {
      await this._runtime.runPromise(
        Effect.gen({ self: this }, function* () {
          const session = yield* this.#getSession();
          yield* session.submitPrompt(createPromptContent(requestProp));
        }).pipe(Effect.provide(this._spaceLayer)),
      );
    } catch (err) {
      log.error('enqueue failed', { error: err });
      this.#registry.set(this.error, Option.some(parseError(err)));
    }
  }

  /**
   * Mirrors turns this processor did not initiate into its own state: active/streaming state is
   * per-processor ({@link useChatProcessor} builds one per mount) while the agent process outlives
   * the mount, so a chat remounted mid-turn would otherwise render as idle.
   *
   * Returns a disposer that stops observing.
   */
  adopt(): () => void {
    let disposed = false;
    let unsubscribe: (() => void) | undefined;
    void this._runtime
      .runPromise(this.#getSession().pipe(Effect.provide(this._spaceLayer)))
      .then((session) => {
        if (disposed) {
          return;
        }

        unsubscribe = this.#registry.subscribe(
          session.running,
          (running) => {
            if (running) {
              void this.#observe(session);
            }
          },
          // The turn is normally already in flight when a remounted chat gets here.
          { immediate: true },
        );
      })
      .catch((err) => log.warn('failed to attach to agent session', { error: err }));

    return () => {
      disposed = true;
      unsubscribe?.();
      // The collector and its stream subscription outlive the unmount otherwise — one per remount,
      // all feeding atoms nothing reads any more.
      const fiber = this.#observeFiber;
      if (fiber) {
        this.#observeFiber = undefined;
        void this._runtime.runPromise(Fiber.interrupt(fiber));
      }
    };
  }

  /**
   * Follows a turn started elsewhere to completion, surfacing its streamed blocks here.
   * A turn this processor issued is owned by {@link request}, which reports its own errors.
   */
  async #observe(session: AgentService.Session): Promise<void> {
    if (this.#requestFiber || this.#observeFiber || this.#registry.get(this.active)) {
      return;
    }

    log.info('observing agent turn', { feed: Obj.getURI(this._feed) });
    try {
      this.#registry.set(this.active, true);
      const effect = Effect.gen({ self: this }, function* () {
        yield* this.#forkEphemeralCollector(session);
        yield* session.waitForCompletion();
        this.#flushStreaming();
      });

      // Tracked apart from `#requestFiber` so `cancel` keeps meaning "stop the request this chat
      // issued", and so the disposer interrupts only the observer.
      this.#observeFiber = this._runtime.runFork(effect.pipe(Effect.provide(this._spaceLayer)));
      const exit = await this._runtime.runPromise(Fiber.await(this.#observeFiber));
      if (Exit.isFailure(exit) && !Cause.hasInterruptsOnly(exit.cause)) {
        throw EffectEx.causeToError(exit.cause);
      }
    } catch (err) {
      // Reported but not surfaced as this chat's error: the mount that issued the turn owns that.
      log.warn('failed to observe agent turn', { error: err });
    } finally {
      this.#registry.set(this.active, false);
      this.#registry.set(this.activity, undefined);
      this.#observeFiber = undefined;
    }
  }

  /**
   * Resolves the agent session for this chat, reusing the process a previous mount left running and
   * spawning one only when there is none.
   */
  #getSession(): Effect.Effect<AgentService.Session, never, AgentService.AgentService | Database.Service> {
    return Effect.gen({ self: this }, function* () {
      const chat = this._options.chat?.target;
      if (!chat) {
        // The agent process is bound to a chat; a processor constructed without one has no
        // conversation to run.
        return yield* Effect.die(new Error('Chat processor requires a chat.'));
      }
      return yield* AgentService.getSession(chat, {
        model: this._options.model,
        provider: this._options.provider,
      });
    });
  }

  /**
   * Forks the collector for the session's ephemeral trace events (streaming blocks and MCP
   * failures) as a child of the calling fiber.
   */
  #forkEphemeralCollector(session: AgentService.Session): Effect.Effect<void> {
    return session.subscribeEphemeral().pipe(
      Stream.runForEach((message) =>
        Effect.sync(() => {
          for (const event of message.events) {
            if (Trace.isOfType(PartialBlock, event)) {
              this.#handleEphemeralMessage(event.data);
            } else if (Trace.isOfType(RequestPhase, event)) {
              this.#registry.set(this.activity, event.data);
            } else if (Trace.isOfType(McpServerError, event)) {
              this.#handleMcpError(event.data);
            }
          }
        }),
      ),
      Effect.forkChild,
      Effect.asVoid,
    );
  }

  /**
   * Cancels the current request.
   */
  async cancel(): Promise<void> {
    await EffectEx.runAndForwardErrors(
      Effect.gen({ self: this }, function* () {
        log.info('cancelling request', { fiber: this.#requestFiber });
        if (this.#requestFiber) {
          yield* Fiber.interrupt(this.#requestFiber);
        }
        // Same options as `request`: looked up bare, a differing model/provider/instructions reads as
        // a reconfiguration, which tears down the running process and spawns a replacement purely to
        // terminate it again.
        const session = yield* this.#getSession();
        yield* session.terminate();
      }).pipe(Effect.provide(this._spaceLayer)),
    );

    this.#requestFiber = undefined;
    this.#discardStreaming();
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
    // The reply supersedes the phase line: once content is arriving the reader no longer needs to be
    // told what the request is doing.
    this.#registry.set(this.activity, undefined);

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
   * Drop in-flight streaming messages (cancel/interrupt — partial blocks are discarded).
   */
  #discardStreaming() {
    this.#registry.set(this.#streaming, []);
    this.#registry.set(this.activity, undefined);
    this.#finalizedIds.clear();
  }

  /**
   * Move remaining streaming messages to pending (called when agent completes).
   */
  #flushStreaming() {
    this.#registry.set(this.activity, undefined);
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
