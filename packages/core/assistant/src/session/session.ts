//
// Copyright 2025 DXOS.org
//

import type * as AiError from '@effect/ai/AiError';
import * as LanguageModel from '@effect/ai/LanguageModel';
import type * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';
import * as Array from 'effect/Array';
import * as Option from 'effect/Option';
import {
  AiParser,
  AiPreprocessor,
  AiSummarizer,
  type AiToolNotFoundError,
  callTool,
  type PromptPreprocessingError,
  type ToolExecutionService,
  type ToolResolverService,
  withoutToolCallParising,
} from '@dxos/ai';
import { type Blueprint } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { type FunctionInvocationService, TracingService } from '@dxos/functions';
import { dbg, log } from '@dxos/log';
import { ContentBlock, Message } from '@dxos/types';

import { type AiAssistantError } from '../errors';

import { formatSystemPrompt, formatUserPrompt } from './format';
import { GenerationObserver } from './observer';
import { pipe } from 'effect/Function';

export type AiSessionRunError = AiError.AiError | PromptPreprocessingError | AiToolNotFoundError | AiAssistantError;

export type AiSessionRunRequirements =
  | LanguageModel.LanguageModel
  | ToolExecutionService
  | ToolResolverService
  | TracingService
  | FunctionInvocationService;

export type AiSessionOptions = {
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

export type AiSessionRunProps<Tools extends Record<string, Tool.Any>> = {
  prompt: string;
  // TODO(wittjosiah): Rename to systemPrompt.
  system?: string;
  history?: Message.Message[];
  objects?: Obj.Unknown[];
  blueprints?: readonly Blueprint.Blueprint[];
  toolkit?: Toolkit.WithHandler<Tools>;
};

export type AiSessionBeginProps = {
  prompt: string;
  system?: string;
  history?: Message.Message[];
  objects?: Obj.Unknown[];
  blueprints?: readonly Blueprint.Blueprint[];
};

export type AiSessionTurnProps<Tools extends Record<string, Tool.Any>> = {
  system: string;
  toolkit?: Toolkit.WithHandler<Tools>;
};

export type AiSessionTurnResult = {
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
// TODO(dmaretskyi): Rename AiSessionRequest
export class AiSession {
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

  constructor(private readonly _options: AiSessionOptions = {}) {
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

  private _submitMessage = (message: Message.Message): Effect.Effect<Message.Message, never, TracingService> =>
    Effect.gen(this, function* () {
      this._pending.push(message);
      yield* this._observer.onMessage(message);
      yield* TracingService.emitConverationMessage(message as any);
      yield* this._onOutput(message);
      return message;
    });

  getToolCalls = () =>
    pipe(
      [...this._history, ...this._pending],
      Array.reverse,
      Array.takeWhile((_) => _.sender.role === 'assistant'),
      Array.flatMap((_) => _.blocks.filter(ContentBlock.is('toolCall')).map((block) => ({ block, message: _ }))),
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
  }: AiSessionBeginProps): Effect.Effect<void, AiSessionRunError, AiSessionRunRequirements> =>
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
    });

  /**
   * Execute a single turn: one LLM generation followed by tool execution.
   * The toolkit and system prompt can be updated between turns to reflect context changes (e.g. dynamically enabled blueprints).
   */
  runAgentTurn = <Tools extends Record<string, Tool.Any>>({
    system,
    toolkit,
  }: AiSessionTurnProps<Tools>): Effect.Effect<AiSessionTurnResult, AiSessionRunError, AiSessionRunRequirements> =>
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

      const observer = this._observer;
      let currentMessageId: Obj.ID | null = null; // Consistent IDs for pending blocks preceding the complete one.
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
                yield* TracingService.emitEphemeralMessage(
                  Obj.make(Message.Message, {
                    id: currentMessageId,
                    created: new Date().toISOString(),
                    sender: { role: 'assistant' },
                    blocks: [block],
                  }),
                );
                return Option.none();
              } else {
                currentMessageId ??= Obj.ID.random();
                const id = currentMessageId;
                currentMessageId = null;
                const message = Obj.make(Message.Message, {
                  id,
                  created: new Date().toISOString(),
                  sender: { role: 'assistant' },
                  blocks: [block],
                });
                yield* TracingService.emitEphemeralMessage(message);
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
    });

  runTools = <Tools extends Record<string, Tool.Any>>({ toolkit }: { toolkit?: Toolkit.WithHandler<Tools> }) =>
    Effect.gen(this, function* () {
      const toolCalls = this.getToolCalls();
      // TODO(burdon): Retry errors? Write result when each completes individually?
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

      // TODO(wittjosiah): Sometimes tool error results are added to the queue before the tool agent statuses.
      // TODO(dmaretskyi): Stream tool results one by one.
      yield* this._submitMessage(
        Obj.make(Message.Message, {
          created: new Date().toISOString(),
          sender: { role: 'tool' },
          blocks: toolResults,
        }),
      );

      this._toolCalls += toolResults.length;
    });
  /**
   * Run a full conversation turn loop. Equivalent to calling `begin()` then `runTurn()` in a loop.
   */
  run = <Tools extends Record<string, Tool.Any>>({
    prompt,
    system: systemTemplate,
    history = [],
    objects = [],
    blueprints = [],
    toolkit,
  }: AiSessionRunProps<Tools>): Effect.Effect<Message.Message[], AiSessionRunError, AiSessionRunRequirements> =>
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
    }).pipe(this._semaphore.withPermits(1), Effect.withSpan('AiSession.run'));
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
