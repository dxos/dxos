//
// Copyright 2025 DXOS.org
//

import { type AiError, AiLanguageModel, type AiResponse, type AiTool, AiToolkit } from '@effect/ai';
import { Array, Chunk, Context, Effect, Function, Option, Queue, type Schema, Stream, String, pipe } from 'effect';

import {
  type AiInputPreprocessingError,
  AiParser,
  AiPreprocessor,
  type AiToolNotFoundError,
  type ConsolePrinter,
  ToolExecutionService,
  ToolResolverService,
  callTools,
  getToolCalls,
} from '@dxos/ai';
import { type Blueprint } from '@dxos/blueprints';
import { todo } from '@dxos/debug';
import { Obj } from '@dxos/echo';
import { ObjectVersion } from '@dxos/echo-db';
import { type ObjectId } from '@dxos/echo-schema';
import { DatabaseService } from '@dxos/functions';
import { log } from '@dxos/log';
import { type ContentBlock, DataType } from '@dxos/schema';
import { trim } from '@dxos/util';

import { AiAssistantError } from '../errors';

export type AiSessionOptions = {};

/**
 * Live observer of the generation process.
 */
export interface GenerationObserver {
  /**
   * Unparsed content block parts from the model.
   */
  onPart: (part: AiResponse.Part) => Effect.Effect<void>;

  /**
   * Parsed content blocks from the model.
   * NOTE: Use block.pending to determine if the block was completed.
   * For each block this will be called 0..n times with a pending block and then once with the final state of the block.
   *
   * Example:
   *  1. { pending: true, text: "Hello"}
   *  2. { pending: true, text: "Hello, I am a"}
   *  3. { pending: false, text: "Hello, I am a helpful assistant!"}
   */
  onBlock: (block: ContentBlock.Any) => Effect.Effect<void>;

  /**
   * Complete messages fired during the session, both from the model and from the user.
   * This message will contain all message blocks emitted through the `onBlock` callback.
   */
  onMessage: (message: DataType.Message) => Effect.Effect<void>;
}

export const GenerationObserver = Object.freeze({
  make: ({
    onPart = Function.constant(Effect.void),
    onBlock = Function.constant(Effect.void),
    onMessage = Function.constant(Effect.void),
  }: Partial<GenerationObserver> = {}): GenerationObserver => ({
    onPart,
    onBlock,
    onMessage,
  }),

  noop: () => GenerationObserver.make(),

  /**
   * Debug printer to be used in unit-tests and browser devtools.
   */
  fromPrinter: (printer: ConsolePrinter) =>
    GenerationObserver.make({
      onBlock: (block) =>
        Effect.sync(() => {
          if (block.pending) {
            return; // Only prints full blocks (better for unit-tests and browser devtools).
          }
          printer.printContentBlock(block);
        }),
      onMessage: (message) =>
        Effect.sync(() => {
          if (message.sender.role === 'assistant') {
            return; // Skip assistant messages since they are printed in the `onBlock` callback.
          }
          printer.printMessage(message);
        }),
    }),
});

export type SessionRunParams<Tools extends AiTool.Any> = {
  prompt: string;
  system?: string;
  history?: DataType.Message[];
  objects?: Obj.Any[]; // TODO(burdon): Meta only (typename and id -- write to binder).
  blueprints?: Blueprint.Blueprint[];
  observer?: GenerationObserver;
  toolkit?: AiToolkit.AiToolkit<Tools>;
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
// TODO(burdon): Rename module.
export class AiSession {
  // TODO(burdon): Review this.
  private readonly _semaphore = Effect.runSync(Effect.makeSemaphore(1));

  /** Pending messages (incl. the current user request). */
  private _pending: DataType.Message[] = [];

  /** Prior history from queue. */
  private _history: DataType.Message[] = [];

  // TODO(dmaretskyi): Remove the queues and convert everything to observer.

  /**
   * Blocks streaming from the model during the session.
   * @deprecated Use `observer.onBlock` instead.
   */
  public readonly blockQueue = Effect.runSync(Queue.unbounded<Option.Option<ContentBlock.Any>>());

  /**
   * Complete messages fired during the session, both from the model and from the user.
   * @deprecated Use `observer.onMessage` instead.
   */
  public readonly messageQueue = Effect.runSync(Queue.unbounded<DataType.Message>());

  /**
   * Unparsed events from the underlying generation stream.
   * @deprecated Use `observer.onPart` instead.
   */
  public readonly eventQueue = Effect.runSync(Queue.unbounded<AiResponse.Part>());

  constructor(private readonly _options: AiSessionOptions = {}) {}

  /**
   * Runs the AI model loop interacting with tools and artifacts.
   * @param params - The session options.
   * @returns The messages generated by the session, including the user's prompt.
   */
  // TODO(dmaretskyi): Toolkit context doesn't get added to the effect type.
  run = <Tools extends AiTool.Any>(
    params: SessionRunParams<Tools>,
  ): Effect.Effect<
    DataType.Message[],
    AiAssistantError | AiInputPreprocessingError | AiToolNotFoundError | AiError.AiError,
    AiLanguageModel.AiLanguageModel | ToolResolverService | ToolExecutionService | AiTool.ToHandler<Tools>
  > =>
    Effect.gen(this, function* () {
      const observer = params.observer ?? GenerationObserver.noop();

      const promptMessages = yield* formatUserPrompt(params.prompt, params.history ?? []);
      yield* this.messageQueue.offer(promptMessages);
      yield* observer.onMessage(promptMessages);

      this._history = [...(params.history ?? [])];
      this._pending = [promptMessages];

      // Potential tool-use loop.
      do {
        log.info('request', {
          pending: this._pending.length,
          history: this._history.length,
          tools: (Object.values(params.toolkit?.tools ?? {}) as AiTool.Any[]).map((tool: AiTool.Any) => tool.name),
        });

        // Build system prompt from blueprint templates.
        // TODO(dmaretskyi): Loading Blueprint from the Database should be done at the higher level. We need a type for the resolved blueprint.
        const blueprints = params.blueprints ?? [];
        let system = yield* pipe(
          blueprints,
          Effect.forEach((blueprint) => Effect.succeed(blueprint.instructions)),
          Effect.flatMap(Effect.forEach((template) => DatabaseService.load(template.source))),
          Effect.map(Array.map((template) => `\n\n<blueprint>${template.content}</blueprint>`)),
          Effect.map(Array.reduce(params.system ?? '', String.concat)),
        );

        const context: string[] =
          params.objects?.map(
            (object) => trim`
              <object>
                <dxn>${Obj.getDXN(object)}</dxn>
                <typename>${Obj.getTypename(object)}</typename>
              </object>
            `,
          ) ?? [];
        if (context.length) {
          context.splice(0, 0, 'Context objects:');
          system += '\n\n' + context.join('\n');
        }

        // TODO(burdon): Pass objects here? Should they be pre-processed?
        const prompt = yield* AiPreprocessor.preprocessAiInput([...this._history, ...this._pending]);

        // Build a combined toolkit from the blueprint tools and the provided toolkit.
        const blueprintToolkit = yield* ToolResolverService.resolveToolkit(blueprints.flatMap(({ tools }) => tools));
        const blueprintToolkitHandler: Context.Context<AiTool.ToHandler<AiTool.Any>> =
          yield* blueprintToolkit.toContext(yield* ToolExecutionService.handlersFor(blueprintToolkit));
        const toolkit = params.toolkit != null ? AiToolkit.merge(params.toolkit, blueprintToolkit) : blueprintToolkit;
        const toolkitWithBlueprintHandlers = yield* toolkit.pipe(
          Effect.provide(blueprintToolkitHandler) as any,
        ) as Effect.Effect<AiToolkit.ToHandler<any>, never, AiTool.ToHandler<Tools>>;

        log.info('run', {
          systemPrompt: [system.slice(0, 32), '...', system.slice(-32)].join(''),
          length: system.length,
          tools: Object.keys(blueprintToolkit.tools),
        });

        const blocks = yield* AiLanguageModel.streamText({
          prompt,
          system,
          toolkit: toolkitWithBlueprintHandlers,
          disableToolCallResolution: true,
        }).pipe(
          AiParser.parseResponse({
            onBlock: (block) =>
              Effect.all([this.blockQueue.offer(Option.some(block)), observer.onBlock(block)], { discard: true }),
            onPart: (part) => Effect.all([this.eventQueue.offer(part), observer.onPart(part)], { discard: true }),
          }),
          Stream.runCollect,
          Effect.map(Chunk.toArray),
        );
        yield* this.blockQueue.offer(Option.none());

        // console.log(JSON.stringify(blocks, null, 2));
        const response = Obj.make(DataType.Message, {
          created: new Date().toISOString(),
          sender: { role: 'assistant' },
          blocks,
        });
        this._pending.push(response);
        yield* this.messageQueue.offer(response);
        yield* observer.onMessage(response);

        const toolCalls = getToolCalls(response);
        if (toolCalls.length === 0) {
          break;
        }

        const toolResults = yield* callTools(toolCalls, toolkitWithBlueprintHandlers as any);
        const toolResultMessage = Obj.make(DataType.Message, {
          created: new Date().toISOString(),
          sender: { role: 'user' },
          blocks: toolResults,
        });
        this._pending.push(toolResultMessage);
        yield* this.messageQueue.offer(toolResultMessage);
        yield* observer.onMessage(toolResultMessage);
      } while (true);

      yield* Queue.shutdown(this.eventQueue);
      yield* Queue.shutdown(this.blockQueue);
      yield* Queue.shutdown(this.messageQueue);

      log.info('done', { pending: this._pending.length });
      return this._pending;
    }).pipe(this._semaphore.withPermits(1), Effect.withSpan('AiSession.run'));

  async runStructured<S extends Schema.Schema.AnyNoContext>(
    _schema: S,
    _options: SessionRunParams<AiTool.Any>,
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

// TODO(burdon): Move to AiPreprocessor.
const formatUserPrompt = (prompt: string, history: DataType.Message[]) =>
  Effect.gen(function* () {
    const prelude: ContentBlock.Any[] = [];

    // TODO(dmaretskyi): Evaluate other approaches as `serviceOption` isn't represented in the type system.
    const artifactDiffResolver = yield* Effect.serviceOption(ArtifactDiffResolver);
    if (Option.isSome(artifactDiffResolver)) {
      const versions = gatherObjectVersions(history);

      const artifactDiff = yield* Effect.tryPromise({
        try: () =>
          artifactDiffResolver.value.resolve(
            [...versions.entries()].map(([id, version]) => ({ id, lastVersion: version })),
          ),
        catch: AiAssistantError.wrap('Artifact diff resolution error'),
      });

      log.info('vision', { artifactDiff, versions });
      for (const [id, { version }] of [...artifactDiff.entries()]) {
        if (ObjectVersion.equals(version, versions.get(id)!)) {
          artifactDiff.delete(id);
          continue;
        }

        prelude.push({ _tag: 'anchor', objectId: id, version });
      }
      if (artifactDiff.size > 0) {
        prelude.push(createArtifactUpdateBlock(artifactDiff));
      }
    }

    return Obj.make(DataType.Message, {
      created: new Date().toISOString(),
      sender: { role: 'user' },
      blocks: [...prelude, { _tag: 'text', text: prompt }],
    });
  });

const gatherObjectVersions = (messages: DataType.Message[]): Map<ObjectId, ObjectVersion> => {
  const artifactIds = new Map<ObjectId, ObjectVersion>();
  for (const message of messages) {
    for (const block of message.blocks) {
      if (block._tag === 'anchor') {
        artifactIds.set(block.objectId, block.version as ObjectVersion);
      }
    }
  }

  return artifactIds;
};

const createArtifactUpdateBlock = (
  artifactDiff: Map<ObjectId, { version: ObjectVersion; diff?: string }>,
): ContentBlock.Any => {
  return {
    _tag: 'text',
    // TODO(dmaretskyi): Does this need to be a special content-block?
    disposition: 'artifact-update',
    text: `
      The following artifacts have been updated since the last message:
      ${[...artifactDiff.entries()]
        .map(([id, { diff }]) => `<changed-artifact id="${id}">${diff ? `\n${diff}` : ''}</changed-artifact>`)
        .join('\n')}
    `,
  };
};

/**
 * Resolves artifact ids to their versions.
 * Used to give the model a sense of the changes to the artifacts made by users during the conversation.
 * The artifacts versions are pinned in the history, and whenever the artifact changes in-between assistant's steps,
 * a diff is inserted into the conversation.
 *
 * Can be optionally provided to the session run call.
 */
// TODO(dmaretskyi): Convert to Context.Reference
export class ArtifactDiffResolver extends Context.Tag('@dxos/assistant/ArtifactDiffResolver')<
  ArtifactDiffResolver,
  ArtifactDiffResolver.Service
>() {}

export namespace ArtifactDiffResolver {
  export type Service = {
    resolve: (artifacts: { id: ObjectId; lastVersion: ObjectVersion }[]) => Promise<
      Map<
        ObjectId,
        {
          version: ObjectVersion;
          diff?: string;
        }
      >
    >;
  };
}
