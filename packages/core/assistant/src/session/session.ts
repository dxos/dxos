//
// Copyright 2025 DXOS.org
//

import { type AiError, AiLanguageModel, type AiTool, type AiToolkit } from '@effect/ai';
import { Chunk, Effect, type Schema, Stream } from 'effect';

import {
  type AiInputPreprocessingError,
  AiParser,
  AiPreprocessor,
  type AiToolNotFoundError,
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

import { mapAiError } from './error-handling';
import { formatSystemPrompt, formatUserPrompt } from './format';
import { GenerationObserver } from './observer';

export type AiSessionRunError = AiError.AiError | AiInputPreprocessingError | AiToolNotFoundError | AiAssistantError;

export type AiSessionRunRequirements =
  | AiLanguageModel.AiLanguageModel
  | ToolExecutionService
  | ToolResolverService
  | TracingService;

export type AiSessionRunParams<Tools extends AiTool.Any> = {
  prompt: string;
  system?: string;
  history?: DataType.Message[];
  objects?: Obj.Any[];
  blueprints?: Blueprint.Blueprint[];
  toolkit?: AiToolkit.ToHandler<Tools>;
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
  static run: <Tools extends AiTool.Any>(
    params: AiSessionRunParams<Tools>,
  ) => Effect.Effect<
    DataType.Message[],
    AiAssistantError | AiInputPreprocessingError | AiToolNotFoundError | AiError.AiError,
    | AiLanguageModel.AiLanguageModel
    | ToolResolverService
    | ToolExecutionService
    | TracingService
    | AiTool.ToHandler<Tools>
  > = <Tools extends AiTool.Any>(params: AiSessionRunParams<Tools>) => new AiSession().run(params);
  run = <Tools extends AiTool.Any>({
    prompt,
    system: systemTemplate,
    history = [],
    objects = [],
    blueprints = [],
    toolkit,
    observer = GenerationObserver.noop(),
  }: AiSessionRunParams<Tools>): Effect.Effect<DataType.Message[], AiSessionRunError, AiSessionRunRequirements> =>
    Effect.gen(this, function* () {
      const now = Date.now();
      let toolCount = 0;

      // Reset.
      this._history = [...history];
      this._pending = [];

      // Generate system prompt.
      // TODO(budon): Dynamically resolve template variables here.
      const system = yield* formatSystemPrompt({ system: systemTemplate, blueprints, objects });

      const pending = this._pending;
      const submitMessage = Effect.fnUntraced(function* (message: DataType.Message) {
        pending.push(message);
        yield* observer.onMessage(message);
        yield* TracingService.emitConverationMessage(message);
        return message;
      });

      const promptMessage = yield* submitMessage(yield* formatUserPrompt({ prompt, history }));

      //
      // Tool call loop.
      //
      do {
        log.info('request', {
          prompt: promptMessage,
          system: { snippet: createSnippet(system), length: system.length },
          pending: this._pending.length,
          history: this._history.length,
          objects: objects?.length ?? 0,
        });

        //
        // Make the request.
        //
        const prompt = yield* AiPreprocessor.preprocessAiInput([...this._history, ...this._pending]);
        const blocks = yield* AiLanguageModel.streamText({
          prompt,
          system,
          toolkit,
          // TODO(burdon): Check if this bug has been fixed and update deps/patches?
          // TODO(burdon): Despite this flag, the model still calls tools.
          //  Flag is only used in generateText (not streamText); patch and submit bug.
          //  https://github.com/Effect-TS/effect/blob/main/packages/ai/ai/src/AiLanguageModel.ts#L401
          disableToolCallResolution: true,
        }).pipe(
          Stream.catchTag(
            'AiError',
            Effect.fnUntraced(function* (err) {
              return yield* Effect.fail(yield* mapAiError(err));
            }),
          ),
          AiParser.parseResponse({
            onBlock: (block) => observer.onBlock(block),
            onPart: (part) => observer.onPart(part),
          }),
          Stream.runCollect,
          Effect.map(Chunk.toArray),
        );

        // Create response message.
        const response = yield* submitMessage(
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'assistant' },
            blocks,
          }),
        );

        // Parse response for tool calls.
        const toolCalls = getToolCalls(response);
        if (toolCalls.length === 0) {
          break;
        }
        if (!toolkit) {
          throw new Error('No toolkit provided'); // TODO(burdon): Throw user error?
        }

        // TODO(burdon): Retry backend errors?
        const toolResults = yield* Effect.forEach(toolCalls, (toolCall) => {
          toolCount++;
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
        yield* submitMessage(
          Obj.make(DataType.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user' },
            blocks: toolResults,
          }),
        );
      } while (true);

      // Summary.
      yield* submitMessage(
        Obj.make(DataType.Message, {
          created: new Date().toISOString(),
          sender: { role: 'assistant' },
          blocks: [
            {
              _tag: 'summary',
              message: 'Success',
              duration: Date.now() - now,
              toolCalls: toolCount,
              // TODO(burdon): Get token count.
            },
          ],
        }),
      );

      log('done', { pending: this._pending.length });
      return this._pending;
    }).pipe(this._semaphore.withPermits(1), Effect.withSpan('AiSession.run'));

  /** Prevents concurrent execution of session. */
  private readonly _semaphore = Effect.runSync(Effect.makeSemaphore(1));

  /**
   * Prior history from queue.
   * NOTE: The conversation should evolve into supporting a git-like graph of messages.
   */
  private _history: DataType.Message[] = [];

  /**
   * Pending messages for this session (incl. the current prompt).
   */

  private _pending: DataType.Message[] = [];

  constructor(private readonly _options: AiSessionOptions = {}) {}

  // TODO(burdon): Implement.
  async runStructured<S extends Schema.Schema.AnyNoContext>(
    _schema: S,
    _options: AiSessionRunParams<AiTool.Any>,
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
