//
// Copyright 2025 DXOS.org
//

import type * as AiError from '@effect/ai/AiError';
import * as LanguageModel from '@effect/ai/LanguageModel';
import type * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import { pipe } from 'effect/Function';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';

import {
  AiParser,
  AiPreprocessor,
  AiSummarizer,
  type AiToolNotFoundError,
  callTool,
  type OpaqueToolkit,
  type PromptPreprocessingError,
  type ToolExecutionService,
  type ToolResolverService,
  withoutToolCallParising,
} from '@dxos/ai';
import { type Blueprint } from '@dxos/blueprints';
import { Database, Obj } from '@dxos/echo';
import { Trace, TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { Operation, OperationRegistry } from '@dxos/operation';
import { ContentBlock, Message } from '@dxos/types';

import { type AiAssistantError } from '../errors';
import { CompleteBlock, PartialBlock } from '../tracing';
import { formatSystemPrompt, formatUserPrompt } from './format';
import { GenerationObserver } from './observer';

export type AiRequestRunError = AiError.AiError | PromptPreprocessingError | AiToolNotFoundError | AiAssistantError;

export type AiRequestRunRequirements =
  | LanguageModel.LanguageModel
  | ToolExecutionService
  | ToolResolverService
  | Database.Service
  | Operation.Service
  | OperationRegistry.Service
  | Trace.TraceService
  /**
   * @deprecated Retained for backward compatibility with tool handlers that use TracingService.emitStatus().
   *   New code should use Trace.TraceService instead.
   */
  | TracingService;

export type AiRequestOptions = {
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
};

export type AiRequestRunProps = {
  prompt: string;
  // TODO(wittjosiah): Rename to systemPrompt.
  system?: string;
  history?: Message.Message[];
  objects?: Obj.Unknown[];
  blueprints?: readonly Blueprint.Blueprint[];
  toolkit?: OpaqueToolkit.Any;
};

export type AiRequestBeginProps = {
  prompt: string;
  system?: string;
  history?: Message.Message[];
  objects?: Obj.Unknown[];
  blueprints?: readonly Blueprint.Blueprint[];
};

export type AiRequestTurnProps = {
  system: string;
  toolkit?: OpaqueToolkit.Any;
};

export type AiRequestTurnResult = {
  messages: Message.Message[];
  done: boolean;
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
export class AiRequest {
  /** Prevents concurrent execution of session. */
  private readonly _semaphore = Effect.runSync(Effect.makeSemaphore(1));

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

  constructor(private readonly _options: AiRequestOptions = {}) {
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
    Effect.gen(this, function* () {
      this._pending.push(message);
      yield* this._observer.onMessage(message);
      for (const block of message.blocks) {
        yield* Trace.write(CompleteBlock, {
          messageId: message.id,
          role: message.sender.role!,
          block,
        });
      }
      yield* this._onOutput(message);
      return message;
    });

  getToolCalls = () =>
    pipe(
      [...this._history, ...this._pending],
      Array.reverse,
      Array.takeWhile((_) => _.sender.role === 'assistant'),
      Array.flatMap((_) => _.blocks.filter(ContentBlock.is('toolCall')).map((block) => ({ block, message: _ }))),
      Array.filter((_) => !_.block.providerExecuted),
    );

  /**
   * Initialize a session: set up history, perform summarization if needed, and submit the user prompt.
   * Must be called before `runTurn()`.
   */
  begin = ({
    prompt,
    system,
    history = [],
    blueprints = [],
    objects = [],
  }: AiRequestBeginProps): Effect.Effect<void, AiRequestRunError, AiRequestRunRequirements> =>
    Effect.gen(this, function* () {
      this._started = Date.now();
      this._history = [...history];
      this._pending = [];

      const systemPrompt = yield* formatSystemPrompt({ system, blueprints, objects }).pipe(Effect.orDie);

      if (this._options.summarizationThreshold !== undefined) {
        const tokenCount = yield* AiPreprocessor.estimateTokens(
          yield* AiPreprocessor.preprocessPrompt([...this._history], {
            system: systemPrompt,
          }),
        );
        if (tokenCount > this._options.summarizationThreshold) {
          const summary = yield* AiSummarizer.summarize([...this._history]);
          yield* this._submitMessage(summary);
        }
      }

      yield* this._submitMessage(yield* formatUserPrompt({ prompt, history }));
    }).pipe(Effect.withSpan('AiRequest.begin'));

  /**
   * Execute a single turn: one LLM generation followed by tool execution.
   * The toolkit and system prompt can be updated between turns to reflect context changes (e.g. dynamically enabled blueprints).
   */
  runAgentTurn = ({
    system,
    toolkit: opaqueToolkit,
  }: AiRequestTurnProps): Effect.Effect<AiRequestTurnResult, AiRequestRunError, AiRequestRunRequirements> =>
    Effect.gen(this, function* () {
      log('request', {
        system: { snippet: createSnippet(system), length: system.length },
        pending: this._pending.length,
        history: this._history.length,
      });

      const prompt = yield* AiPreprocessor.preprocessPrompt([...this._history, ...this._pending], {
        system,
        cacheControl: 'ephemeral',
      });

      const toolkit: Toolkit.WithHandler<any> | undefined = opaqueToolkit
        ? yield* opaqueToolkit.handlers as Effect.Effect<Toolkit.WithHandler<any>>
        : undefined;

      const observer = this._observer;
      let currentMessageId: Obj.ID | null = null;

      const messages = yield* LanguageModel.streamText({
        prompt,
        toolkit,
        disableToolCallResolution: true,
      }).pipe(
        withoutToolCallParising,
        AiParser.parseResponse({
          emitPartial: true,
          onBegin: () => observer.onBegin(),
          onBlock: (block) => observer.onBlock(block),
          onPart: (part) => observer.onPart(part as any),
          onEnd: (summary) => observer.onEnd(summary),
        }),
        Stream.mapEffect(
          (block) =>
            Effect.gen(this, function* () {
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
        Stream.filterMap((_) => _),
        Stream.runCollect,
        Effect.map(Chunk.toArray),
      );

      const toolCalls = this.getToolCalls();

      if (toolCalls.length === 0) {
        this._ended = Date.now();
        return { messages, done: true };
      } else if (!toolkit) {
        throw new Error('No toolkit provided');
      }

      return { messages, done: false };
    }).pipe(Effect.withSpan('AiRequest.runAgentTurn'));

  runTools = ({
    toolkit: opaqueToolkit,
  }: {
    toolkit?: OpaqueToolkit.Any;
  }): Effect.Effect<void, AiRequestRunError, AiRequestRunRequirements> =>
    Effect.gen(this, function* () {
      const toolkit: Toolkit.WithHandler<any> | undefined = opaqueToolkit
        ? yield* opaqueToolkit.handlers as Effect.Effect<Toolkit.WithHandler<any>>
        : undefined;
      const toolCalls = this.getToolCalls();
      const toolResults = yield* Effect.forEach(toolCalls, ({ block, message }) => {
        if (!toolkit) {
          throw new Error('No toolkit provided');
        }
        return callTool(toolkit, block).pipe(
          Effect.provide(
            TracingService.layerSubframe((context) => ({
              ...context,
              parentMessage: message.id,
              toolCallId: block.toolCallId,
            })),
          ),
        );
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
  run = ({
    prompt,
    system: systemTemplate,
    history = [],
    objects = [],
    blueprints = [],
    toolkit,
  }: AiRequestRunProps): Effect.Effect<Message.Message[], AiRequestRunError, AiRequestRunRequirements> =>
    Effect.gen(this, function* () {
      yield* this.begin({ prompt, system: systemTemplate, history, objects, blueprints });

      const system = yield* formatSystemPrompt({ system: systemTemplate, blueprints, objects }).pipe(Effect.orDie);

      do {
        const { done } = yield* this.runAgentTurn({ system, toolkit });
        if (done) {
          break;
        }
        yield* this.runTools({ toolkit });
      } while (true);

      log('done', { pending: this._pending.length, duration: this.duration, tools: this._toolCalls });
      return this._pending;
    }).pipe(this._semaphore.withPermits(1), Effect.withSpan('AiRequest.run'));
}

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
