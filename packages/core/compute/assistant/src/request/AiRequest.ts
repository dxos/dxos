//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as Result from 'effect/Result';
import * as Schedule from 'effect/Schedule';
import * as Semaphore from 'effect/Semaphore';
import * as Stream from 'effect/Stream';
import * as AiError from 'effect/unstable/ai/AiError';
import * as LanguageModel from 'effect/unstable/ai/LanguageModel';
import type * as Toolkit from 'effect/unstable/ai/Toolkit';

import {
  AiParser,
  AiPreprocessor,
  AiSummarizer,
  type AiToolNotFoundError,
  type OpaqueToolkit,
  type PromptPreprocessingError,
  type ToolExecutionService,
  type ToolResolverService,
  callTool,
  withoutToolCallParsing,
} from '@dxos/ai';
import type * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import type * as Skill from '@dxos/compute/Skill';
import * as Trace from '@dxos/compute/Trace';
import { Database, Obj, Registry } from '@dxos/echo';
import { log } from '@dxos/log';
import { ContentBlock, Message } from '@dxos/types';

import { getOperationFromTool } from '../tool-runtime/services';
import { type AiAssistantError, CompleteBlock, PartialBlock, emitRequestPhase } from '../util';
import { formatSystemPrompt, formatUserPrompt } from './format';
import { GenerationObserver } from './observer';

export type RunError = AiError.AiError | PromptPreprocessingError | AiToolNotFoundError | AiAssistantError;

/**
 * An {@link AiError.AiError} raised because the model called a tool the toolkit does not contain.
 * Narrowed with a guard rather than a cast: the recovery reads the reason's fields.
 */
type ToolNotFoundError = AiError.AiError & { readonly reason: AiError.ToolNotFoundError };

const isToolNotFound = (error: unknown): error is ToolNotFoundError =>
  AiError.isAiError(error) && error.reason._tag === 'ToolNotFoundError';

/**
 * How many turns of one request may be spent reporting unresolvable tool calls. A model that keeps
 * calling the same absent tool would otherwise loop until the token budget is gone; past this the
 * error is raised, so a persistent fault still surfaces.
 */
const MAX_UNRESOLVED_TOOL_TURNS = 2;

/**
 * An {@link AiError.AiError} the provider raised while authenticating the request.
 * Narrowed with a guard rather than a cast: the retry predicate reads the reason's `kind`.
 */
type AuthenticationError = AiError.AiError & { readonly reason: AiError.AuthenticationError };

const isAuthenticationError = (error: unknown): error is AuthenticationError =>
  AiError.isAiError(error) && error.reason._tag === 'AuthenticationError';

/**
 * Whether the provider rejected the request for permissions that have not yet propagated to the
 * key. Unlike the other authentication kinds (a missing, expired, or invalid key, which need a
 * credential change and never recover on their own), this one clears by itself, so it is the only
 * one worth re-issuing — `AuthenticationError.isRetryable` is `false` for all of them.
 */
const isInsufficientPermissions = (error: unknown): boolean =>
  isAuthenticationError(error) && error.reason.kind === 'InsufficientPermissions';

/** Attempts spent re-issuing a request rejected for insufficient permissions, beyond the first. */
const INSUFFICIENT_PERMISSIONS_RETRIES = 10;

/** Spaced rather than exponential: a propagation delay is bounded, and ten backed-off waits are not. */
const INSUFFICIENT_PERMISSIONS_RETRY_DELAY = '2 seconds';

export type RunRequirements =
  | LanguageModel.LanguageModel
  | ToolExecutionService
  | ToolResolverService
  | Database.Service
  | Operation.Service
  | Registry.Service
  | Trace.TraceService;

export type Options = {
  /**
   * Summarize before executing the prompt if the existing history exceeds this threshold.
   */
  summarizationThreshold?: number;

  // TODO(dmaretskyi): Plan to phase out in favor of TracingService and the return type being a stream.
  observer?: GenerationObserver;
  /**
   * Callback for when a message is received from the user, model, or tool.
   * This is useful for streaming the output to a queue.
   */
  onOutput?: (message: Message.Message) => Effect.Effect<void, never, never>;

  /**
   * When false, turn messages are not appended to the feed or written as persisted trace blocks.
   *
   * @default true
   */
  persist?: boolean;
};

export type RunProps<R = never> = {
  prompt: string | ContentBlock.Any[];
  // TODO(wittjosiah): Rename to systemPrompt.
  system?: string;
  history?: Message.Message[];
  objects?: Obj.Unknown[];
  skills?: readonly Skill.Skill[];
  /** Rendered inline into the system prompt; passed explicitly rather than inferred from `objects`. */
  instructions?: readonly Instructions.Instructions[];
  toolkit?: OpaqueToolkit.OpaqueToolkit<R>;
};

export type BeginProps = {
  prompt: string | ContentBlock.Any[];
  system?: string;
  history?: Message.Message[];
  objects?: Obj.Unknown[];
  skills?: readonly Skill.Skill[];
  instructions?: readonly Instructions.Instructions[];
};

export type TurnProps<R = never> = {
  system: string;
  toolkit?: OpaqueToolkit.OpaqueToolkit<R>;
};

export type TurnResult = {
  messages: Message.Message[];
  done: boolean;
  /**
   * Provider finish reason for this turn. `pause` means the provider paused a server-tool turn
   * mid-execution (e.g. Anthropic `pause_turn`) and the turn must be resumed by issuing another
   * request without mutating the trailing assistant content.
   */
  finishReason?: ContentBlock.FinishReason;
};

/**
 * Contains message history, tools, current context.
 * Current context means the state of the app, time of day, and other contextual information.
 * It makes requests to the model, its a state machine.
 * It keeps track of the current goal.
 * It manages the context window.
 * Tracks the success criteria of reaching the goal, exposing metrics (stretch).
 * Could be run locally in the app or remotely.
 * Could be personal or shared.
 */
export class Request {
  /** Prevents concurrent execution of session. */
  private readonly _semaphore = Effect.runSync(Semaphore.make(1));

  private readonly _observer: GenerationObserver;
  private readonly _onOutput: (message: Message.Message) => Effect.Effect<void, never, never>;

  /** Message history from queue. */
  // TODO(burdon): Evolve into supporting a git-like graph of messages.
  private _history: Message.Message[] = [];

  /** Pending messages for this session (incl. the current prompt). */
  private _pending: Message.Message[] = [];

  private _started = 0;
  private _ended = 0;
  private _toolCalls = 0;
  /** Turns of this request spent reporting a tool call the toolkit could not resolve. */
  #unresolvedTools = 0;

  constructor(private readonly _options: Options = {}) {
    this._observer = _options.observer ?? GenerationObserver.noop();
    this._onOutput = _options.onOutput ?? (() => Effect.void);
  }

  get duration(): number {
    return this._ended - this._started;
  }

  get toolCalls(): number {
    return this._toolCalls;
  }

  get pending(): readonly Message.Message[] {
    return this._pending;
  }

  private _submitMessage = (message: Message.Message): Effect.Effect<Message.Message, never, Trace.TraceService> =>
    Effect.gen({ self: this }, function* () {
      this._pending.push(message);
      yield* this._observer.onMessage(message);
      if (this._options.persist === false) {
        return message;
      }
      for (const block of message.blocks) {
        log('write complete block', {
          messageId: message.id,
          role: message.sender.role!,
          block: JSON.stringify(block),
        });
        yield* Trace.write(CompleteBlock, {
          messageId: message.id,
          role: message.sender.role!,
          block,
        });
      }
      yield* this._onOutput(message);
      return message;
    });

  /**
   * Appends a system-generated note to the turn, addressed to the model: synthetic, so it renders as
   * its own panel rather than as words the reader typed. Used to report a fault the model can act on
   * (an unresolvable tool call) without failing the request.
   */
  submitNotice = (text: string): Effect.Effect<Message.Message, never, Trace.TraceService> =>
    this._submitMessage(
      Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'user' },
        blocks: [ContentBlock.Text.make({ text, disposition: 'synthetic' })],
      }),
    );

  getToolCalls = () =>
    pipe(
      [...this._history, ...this._pending],
      Array.reverse,
      Array.takeWhile((_) => _.sender.role === 'assistant'),
      Array.flatMap((_) => _.blocks.filter(ContentBlock.is('toolCall')).map((block) => ({ block, message: _ }))),
      Array.filter((_) => !_.block.providerExecuted),
      Array.reverse,
    );

  /**
   * Initialize a session: set up history, perform summarization if needed, and submit the user prompt.
   * Must be called before `runTurn()`.
   */
  begin = ({
    prompt,
    system,
    history = [],
    skills = [],
    objects = [],
    instructions = [],
  }: BeginProps): Effect.Effect<void, RunError, RunRequirements> =>
    Effect.gen({ self: this }, function* () {
      this._started = Date.now();
      this._history = [...history];
      this._pending = [];
      // Per-run allowance: a reused Request must not inherit a spent budget from the previous run.
      this.#unresolvedTools = 0;

      const systemPrompt = yield* formatSystemPrompt({ system, skills, objects, instructions }).pipe(Effect.orDie);

      if (this._options.summarizationThreshold !== undefined) {
        const tokenCount = yield* AiPreprocessor.estimateTokens(
          yield* AiPreprocessor.preprocessPrompt([...this._history], {
            system: systemPrompt,
          }),
        );
        if (tokenCount > this._options.summarizationThreshold) {
          // A summarization pass is itself a model round-trip, so it can dominate the wait before
          // the turn the reader asked for even starts.
          yield* emitRequestPhase('summarizing');
          const summary = yield* AiSummarizer.summarize([...this._history]);
          yield* this._submitMessage(summary);
        }
      }

      yield* this._submitMessage(yield* formatUserPrompt({ prompt, history }));
    }).pipe(Effect.withSpan('AiRequest.begin'));

  /**
   * Reports a tool call the toolkit could not resolve back to the model, as a turn it can correct.
   *
   * The provider raises this while DECODING its own response — it needs the tool's schema to decode
   * the arguments — so the failure arrives before any tool call reaches the loop, and it kills the
   * whole turn. The usual causes are a skill whose instructions name a tool whose handler this host
   * never contributed, and a model inventing a name; both leave the reader with no reply at all.
   *
   * The tool call itself is lost: the provider discards the event batch it failed in, including the
   * `tool-params-end` the parser needs to complete the block, so nothing dangles in history that
   * would need a matching tool result — a plain note is enough.
   */
  #reportUnresolvedTool = (error: ToolNotFoundError): Effect.Effect<TurnResult, RunError, Trace.TraceService> =>
    Effect.gen({ self: this }, function* () {
      if (++this.#unresolvedTools > MAX_UNRESOLVED_TOOL_TURNS) {
        return yield* Effect.fail(error);
      }

      const { toolName, availableTools } = error.reason;
      log.warn('tool not found; reporting to the model', { tool: toolName, available: availableTools });
      yield* this.submitNotice(
        `The tool '${toolName}' does not exist, so nothing was called. ` +
          `The tools you can call are: ${availableTools.join(', ')}. ` +
          'Continue with those, and say so plainly if the task needs one that is missing.',
      );

      return { messages: [], done: false };
    });

  /**
   * Execute a single turn: one LLM generation followed by tool execution.
   * The toolkit and system prompt can be updated between turns to reflect context changes (e.g. dynamically enabled skills).
   */
  runAgentTurn = <const R = never>({
    system,
    toolkit: opaqueToolkit,
  }: TurnProps<R>): Effect.Effect<TurnResult, RunError, RunRequirements | R> =>
    Effect.gen({ self: this }, function* () {
      log('request', {
        system: { snippet: createSnippet(system), length: system.length },
        pending: this._pending.length,
        history: this._history.length,
      });

      yield* emitRequestPhase('encoding-prompt');
      const prompt = yield* AiPreprocessor.preprocessPrompt([...this._history, ...this._pending], {
        system,
        cacheControl: 'ephemeral',
      });

      const toolkit = opaqueToolkit ? yield* opaqueToolkit.handlers : undefined;

      const observer = this._observer;
      let currentMessageId: Obj.ID | null = null;
      let finishReason: ContentBlock.FinishReason | undefined;

      // v4 overloads `streamText` on the presence of `toolkit`, so the two cases branch explicitly
      // rather than passing a possibly-undefined key.
      const openStream = () =>
        toolkit
          ? LanguageModel.streamText({ prompt, toolkit, disableToolCallResolution: true })
          : LanguageModel.streamText({ prompt, disableToolCallResolution: true });

      // Counts attempts at the provider rather than turns: the retry below re-runs the whole
      // collect, so `Stream.unwrap` re-evaluates this on each attempt and the reader sees the
      // request being re-issued instead of an unexplained stall.
      let attempt = 0;
      const stream = Stream.unwrap(
        Effect.gen(function* () {
          yield* emitRequestPhase('contacting-provider', { attempt: ++attempt });
          return openStream();
        }),
      );

      // Set once any block of this attempt has been submitted, after which the request cannot be
      // re-issued: the messages are already in `_pending` and a second attempt would duplicate them.
      let emitted = false;

      const messages = yield* stream.pipe(
        withoutToolCallParsing,
        AiParser.parseResponse({
          emitPartial: true,
          // Tagged chain-of-thought (<cot>/<think>/<reasoning>) becomes reasoning blocks, which the
          // UI renders per view type; flattened to prose it can neither be shown nor hidden.
          parseReasoningTags: true,
          onBegin: () => observer.onBegin(),
          onBlock: (block) => observer.onBlock(block),
          onPart: (part) => observer.onPart(part as any),
          onEnd: (summary) => observer.onEnd(summary),
        }),
        Stream.map((block) => enrichToolCallBlock(block, toolkit)),
        Stream.mapEffect(
          (block) =>
            Effect.gen({ self: this }, function* () {
              if (block._tag === 'stats' && block.finishReason !== undefined) {
                finishReason = block.finishReason;
              }
              if (block.pending) {
                currentMessageId ??= Obj.ID.random();
                log('emit ephemeral message', { id: currentMessageId, type: block._tag });
                yield* Trace.write(PartialBlock, {
                  messageId: currentMessageId,
                  role: 'assistant',
                  block,
                });
                return Option.none();
              } else {
                currentMessageId ??= Obj.ID.random();
                const id = currentMessageId;
                currentMessageId = null;
                log('emit complete message', { id, type: block._tag });
                emitted = true;
                const message = Obj.make(Message.Message, {
                  id,
                  created: new Date().toISOString(),
                  sender: { role: 'assistant' },
                  blocks: [block],
                });
                return Option.some(yield* this._submitMessage(message));
              }
            }),
          { concurrency: 1, unordered: false },
        ),
        Stream.filterMap((value) => (Option.isSome(value) ? Result.succeed(value.value) : Result.failVoid)),
        Stream.runCollect,
        Effect.retry({
          schedule: Schedule.spaced(INSUFFICIENT_PERMISSIONS_RETRY_DELAY).pipe(
            Schedule.jittered,
            Schedule.upTo({ times: INSUFFICIENT_PERMISSIONS_RETRIES }),
          ),
          while: (error) => {
            if (emitted || !isInsufficientPermissions(error)) {
              return false;
            }
            log.warn('insufficient permissions; retrying request', { error });
            return true;
          },
        }),
      );
      log('messages', { messages });

      // A paused server-tool turn (e.g. Anthropic `pause_turn`) is not complete: the provider
      // expects the assistant content to be resent so it can finish executing the server tool.
      // No local tool execution is needed — just another request.
      if (finishReason === 'pause') {
        return { messages, done: false, finishReason };
      }

      const toolCalls = this.getToolCalls();

      if (toolCalls.length === 0) {
        this._ended = Date.now();
        return { messages, done: true, finishReason };
      } else if (!toolkit) {
        throw new Error('No toolkit provided');
      }

      return { messages, done: false, finishReason };
    }).pipe(
      Effect.catchIf(isToolNotFound, (error) => this.#reportUnresolvedTool(error)),
      Effect.withSpan('AiRequest.runAgentTurn'),
    );

  runTools = <const R = never>({
    toolkit: opaqueToolkit,
  }: {
    toolkit?: OpaqueToolkit.OpaqueToolkit<R>;
  }): Effect.Effect<void, RunError, RunRequirements | R> =>
    Effect.gen({ self: this }, function* () {
      const toolkit = opaqueToolkit ? yield* opaqueToolkit.handlers : undefined;
      const toolCalls = this.getToolCalls();
      // A turn can end with no calls to run — a turn recovered from an unresolvable tool call leaves
      // none. Submitting anyway would append a tool message with no blocks, which the provider
      // rejects as empty content.
      if (toolCalls.length === 0) {
        return;
      }
      const toolResults = yield* Effect.forEach(toolCalls, ({ block, message }) => {
        if (!toolkit) {
          throw new Error('No toolkit provided');
        }
        return callTool(toolkit, block);
      });

      yield* this._submitMessage(
        Obj.make(Message.Message, {
          created: new Date().toISOString(),
          sender: { role: 'tool' },
          blocks: toolResults,
        }),
      );

      this._toolCalls += toolResults.length;
    }).pipe(Effect.withSpan('AiRequest.runTools'));

  /**
   * Run a full conversation turn loop. Equivalent to calling `begin()` then `runTurn()` in a loop.
   */
  run = <const R = never>({
    prompt,
    system: systemTemplate,
    history = [],
    objects = [],
    skills = [],
    instructions = [],
    toolkit,
  }: RunProps<R>): Effect.Effect<Message.Message[], RunError, RunRequirements | R> =>
    Effect.gen({ self: this }, function* () {
      yield* this.begin({ prompt, system: systemTemplate, history, objects, skills, instructions });

      const system = yield* formatSystemPrompt({ system: systemTemplate, skills, objects, instructions }).pipe(
        Effect.orDie,
      );

      do {
        const { done, finishReason } = yield* this.runAgentTurn({ system, toolkit });
        if (done) {
          break;
        }
        // A paused server-tool turn resumes with another request and no local tool execution.
        if (finishReason === 'pause') {
          continue;
        }
        yield* this.runTools({ toolkit });
      } while (true);

      log('done', { pending: this._pending.length, duration: this.duration, tools: this._toolCalls });
      return this._pending;
    }).pipe(this._semaphore.withPermits(1), Effect.withSpan('AiRequest.run'));
}

/**
 * Annotates `toolCall` blocks with metadata about the backing Operation, when one exists.
 * Tool calls that resolve to a toolkit handler (no Operation) are left unchanged so callers can
 * distinguish operation invocations from inline tool calls.
 */
const enrichToolCallBlock = (
  block: ContentBlock.Any,
  toolkit: Toolkit.WithHandler<any> | undefined,
): ContentBlock.Any => {
  if (block._tag !== 'toolCall' || !toolkit) {
    return block;
  }
  const tool = toolkit.tools[block.name];
  if (!tool) {
    return block;
  }
  // Some tools (provider-defined, raw MCP) don't carry an Effect `Context` for annotations and
  // `getOperationFromTool` throws. Be defensive: treat any failure as "no operation".
  let operationOpt: Option.Option<Operation.Definition.Any>;
  try {
    operationOpt = getOperationFromTool(tool);
  } catch {
    return block;
  }
  if (Option.isNone(operationOpt)) {
    return block;
  }
  const { meta } = operationOpt.value;
  return {
    ...block,
    operationKey: meta.key,
    operationName: meta.name,
    operationIcon: meta.icon,
  } satisfies ContentBlock.ToolCall;
};

const createSnippet = (text: string, len = 32) =>
  text.length <= len * 2 ? text : [text.slice(0, len), '...', text.slice(-len)].join('');

// TODO(dmaretskyi): Extract as a general util.
const logDump = (message: string, data: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { writeFileSync } = require('node:fs');
  const path = `/tmp/log-data-${Date.now()}.json`;
  writeFileSync(path, JSON.stringify(data, null, 2));
  log.info(message, { path });
};
