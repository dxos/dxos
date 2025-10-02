//
// Copyright 2025 DXOS.org
//

import { type AiError, LanguageModel, type Tool, type Toolkit } from '@effect/ai';
import { Chunk, Effect, type Schema, Stream } from 'effect';

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
import { DataType } from '@dxos/schema';

import { type AiAssistantError } from '../errors';

import { formatSystemPrompt, formatUserPrompt } from './format';
import { GenerationObserver } from './observer';

export type AiSessionRunError = AiError.AiError | PromptPreprocessingError | AiToolNotFoundError | AiAssistantError;

export type AiSessionRunRequirements =
  | LanguageModel.LanguageModel
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

export type AiSessionRunParams<Tools extends Record<string, Tool.Any>> = {
  prompt: string;
  system?: string;
  history?: DataType.Message[];
  objects?: Obj.Any[];
  blueprints?: Blueprint.Blueprint[];
  toolkit?: Toolkit.WithHandler<Tools>;
  observer?: GenerationObserver;
};

export type AiSessionOptions = {};

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
  private _history: DataType.Message[] = [];

  /** Pending messages for this session (incl. the current prompt). */
  private _pending: DataType.Message[] = [];

  constructor(private readonly _options: AiSessionOptions = {}) {}

  run = <Tools extends Record<string, Tool.Any>>({
    prompt,
    system: systemTemplate,
    history = [],
    objects = [],
    blueprints = [],
    toolkit,
    observer = GenerationObserver.noop(),
  }: AiSessionRunParams<Tools>): Effect.Effect<DataType.Message[], AiSessionRunError, AiSessionRunRequirements> =>
    Effect.gen(this, function* () {
      this._history = [...history];
      this._pending = [];
      const pending = this._pending;

      const submitMessage = Effect.fnUntraced(function* (message: DataType.Message) {
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
          Obj.make(DataType.Message, {
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
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'tool' },
            blocks: toolResults,
          }),
        );
      } while (true);

      log('done', { pending: this._pending.length });
      return this._pending;
    }).pipe(this._semaphore.withPermits(1), Effect.withSpan('AiSession.run'));

  /**
   * @deprecated
   */
  // TODO(burdon): Implement or remove.
  async runStructured<S extends Schema.Schema.AnyNoContext>(
    _schema: S,
    _options: AiSessionRunParams<any>,
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
