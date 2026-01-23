//
// Copyright 2025 DXOS.org
//

import type * as AiError from '@effect/ai/AiError';
import * as LanguageModel from '@effect/ai/LanguageModel';
import type * as Tool from '@effect/ai/Tool';
import type * as Toolkit from '@effect/ai/Toolkit';
import * as Chunk from 'effect/Chunk';
import * as Effect from 'effect/Effect';
import type * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';

import {
  AiParser,
  AiPreprocessor,
  type AiToolNotFoundError,
  type PromptPreprocessingError,
  type ToolExecutionService,
  type ToolResolverService,
  callTool,
  getToolCalls,
} from '@dxos/ai';
import { type Blueprint } from '@dxos/blueprints';
import { todo } from '@dxos/debug';
import { Obj } from '@dxos/echo';
import { TracingService } from '@dxos/functions';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import { type AiAssistantError } from '../errors';

import { formatSystemPrompt, formatUserPrompt } from './format';
import { GenerationObserver } from './observer';

export type AiSessionRunError = AiError.AiError | PromptPreprocessingError | AiToolNotFoundError | AiAssistantError;

export type AiSessionRunRequirements =
  | LanguageModel.LanguageModel
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

export type AiSessionOptions = {};

export type AiSessionRunProps<Tools extends Record<string, Tool.Any>> = {
  prompt: string;
  // TODO(wittjosiah): Rename to systemPrompt.
  system?: string;
  history?: Message.Message[];
  objects?: Obj.Any[];
  blueprints?: readonly Blueprint.Blueprint[];
  toolkit?: Toolkit.WithHandler<Tools>;
  observer?: GenerationObserver<Tools>;
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
export class AiSession {
  /** Prevents concurrent execution of session. */
  private readonly _semaphore = Effect.runSync(Effect.makeSemaphore(1));

  /** Message history from queue. */
  // TODO(burdon): Evolve into supporting a git-like graph of messages.
  private _history: Message.Message[] = [];

  /** Pending messages for this session (incl. the current prompt). */
  private _pending: Message.Message[] = [];

  private _started = 0;
  private _ended = 0;
  private _toolCalls = 0;

  constructor(private readonly _options: AiSessionOptions = {}) {}

  get duration(): number {
    return this._ended - this._started;
  }

  get toolCalls(): number {
    return this._toolCalls;
  }

  run = <Tools extends Record<string, Tool.Any>>({
    prompt,
    system: systemTemplate,
    history = [],
    objects = [],
    blueprints = [],
    toolkit,
    observer = GenerationObserver.noop(),
  }: AiSessionRunProps<Tools>): Effect.Effect<Message.Message[], AiSessionRunError, AiSessionRunRequirements> =>
    Effect.gen(this, function* () {
      this._started = Date.now();
      this._history = [...history];
      this._pending = [];
      const pending = this._pending;

      const submitMessage = Effect.fnUntraced(function* (message: Message.Message) {
        pending.push(message);
        yield* observer.onMessage(message);
        yield* TracingService.emitConverationMessage(message);
        return message;
      });

      // Submit the prompt.
      // TODO(burdon): Remove if cancelled?
      const promptMessage = yield* submitMessage(yield* formatUserPrompt({ prompt, history }));

      // Generate system and prompt messages.
      const system = yield* formatSystemPrompt({ system: systemTemplate, blueprints, objects });

      // Tool call loop.
      do {
        log('request', {
          prompt: promptMessage,
          system: { snippet: createSnippet(system), length: system.length },
          pending: this._pending.length,
          history: this._history.length,
          objects: objects?.length ?? 0,
        });

        const prompt = yield* AiPreprocessor.preprocessPrompt([...this._history, ...this._pending], { system });

        // Execute the stream request.
        // logDump('prompt', Prompt.Prompt.pipe(Schema.encodeSync)(prompt));
        const blocks = yield* LanguageModel.streamText({
          prompt,
          toolkit,
          disableToolCallResolution: true,
        }).pipe(
          // TOOD(dmaretskyi): Error mapping.
          AiParser.parseResponse({
            onBegin: () => observer.onBegin(),
            onBlock: (block) => observer.onBlock(block),
            onPart: (part) => observer.onPart(part),
            onEnd: (summary) => observer.onEnd(summary),
          }),
          Stream.runCollect,
          Effect.map(Chunk.toArray),
        );

        // Create the response message.
        const response = yield* submitMessage(
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant' },
            blocks,
          }),
        );

        // Parse the response for tool calls.
        const toolCalls = getToolCalls(response);
        if (toolCalls.length === 0) {
          break;
        } else if (!toolkit) {
          throw new Error('No toolkit provided'); // TODO(burdon): Throw user error?
        }

        // Execute the tool calls.
        // TODO(burdon): Retry errors? Write result when each completes individually?
        const toolResults = yield* Effect.forEach(toolCalls, (toolCall) => {
          return callTool(toolkit, toolCall).pipe(
            Effect.provide(
              TracingService.layerSubframe((context) => ({
                ...context,
                parentMessage: response.id,
                toolCallId: toolCall.toolCallId,
              })),
            ),
          );
        });

        // Add to queue and continue loop.
        // TODO(wittjosiah): Sometimes tool error results are added to the queue before the tool agent statuses.
        //   This results in a broken execution graph.
        yield* submitMessage(
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: { role: 'tool' },
            blocks: toolResults,
          }),
        );

        this._toolCalls++;
      } while (true);

      this._ended = Date.now();
      log('done', { pending: this._pending.length, duration: this.duration, tools: this._toolCalls });
      return this._pending;
    }).pipe(this._semaphore.withPermits(1), Effect.withSpan('AiSession.run'));

  /**
   * @deprecated
   */
  // TODO(burdon): Implement or remove.
  async runStructured<S extends Schema.Schema.AnyNoContext>(
    _schema: S,
    _options: AiSessionRunProps<any>,
  ): Promise<Schema.Schema.Type<S>> {
    return todo();
    // const parser = structuredOutputParser(schema);
    // const result = await this.run({
    //   ...options,
    //   executableTools: [...(options.executableTools ?? []), parser.tool],
    // });
    // return parser.getResult(result);
  }
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
