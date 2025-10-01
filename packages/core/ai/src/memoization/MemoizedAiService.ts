import { Chat, LanguageModel, Prompt, Response, Tool, Toolkit } from '@effect/ai';
import * as AiService from '../AiService';
import { Effect, Layer, Schema, type Context, Option, Stream, Array, Order, pipe, Data } from 'effect';
import { todo } from '@dxos/debug';
import { readFile, writeFile } from 'node:fs/promises';
import { open, type FileHandle } from 'node:fs/promises';
import { deepEqual } from 'node:assert';
import { isDeepStrictEqual } from 'node:util';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import type { StreamPartEncoded } from '@effect/ai/Response';
import { diffChars, createPatch } from 'diff';

export interface MemoizedAiService extends AiService.Service {}

export interface MakeOptions {
  upstream: AiService.Service;
  /**
   * Filename for memoized conversations to be stored at.
   */
  storePath: string;

  allowGeneration: boolean;
}

export const make = (options: MakeOptions): MemoizedAiService => {
  return {
    model: (model) =>
      Layer.effect(
        LanguageModel.LanguageModel,
        Effect.gen(function* () {
          const upstreamModel = yield* LanguageModel.LanguageModel.pipe(Effect.provide(options.upstream.model(model)));
          return yield* makeModel({
            upstreamModel,
            modelName: model,
            storePath: options.storePath,
            allowGeneration: options.allowGeneration,
          });
        }),
      ),
  };
};

export const layer = (options: Omit<MakeOptions, 'upstream'>) =>
  Layer.effect(
    AiService.AiService,
    Effect.gen(function* () {
      const upstream = yield* AiService.AiService;
      return make({
        upstream,
        storePath: options.storePath,
        allowGeneration: options.allowGeneration,
      });
    }),
  );

type TestContextLike = {
  task: {
    file: {
      filepath: string;
    };
  };
};

export const injectIntoTest =
  () =>
  <A, E, R>(
    effect: Effect.Effect<A, E, R | AiService.AiService>,
    ctx: TestContextLike,
  ): Effect.Effect<A, E, R | AiService.AiService> => {
    return Effect.provide(
      layer({
        storePath: ctx.task.file.filepath.replace('.test.ts', '.conversations.json'),
        allowGeneration: ['1', 'true'].includes(process.env.ALLOW_LLM_GENERATION ?? '0'),
      }),
    )(effect);
  };

interface MakeModelOptions {
  upstreamModel: LanguageModel.Service;
  modelName: string;
  storePath: string;
  allowGeneration: boolean;
}

const makeModel = (options: MakeModelOptions): Effect.Effect<LanguageModel.Service> => {
  const store = new MemoizedStore(options.storePath);

  return LanguageModel.make({
    generateText: Effect.fn('MemoizedLanguageModel.generateText')(function* (params) {
      const conversation = getConverstaionFromOptions(options.modelName, params);
      const memoized = yield* store.getMemoizedConversation(conversation);
      if (Option.isSome(memoized)) {
        const continuation = getContinuation(params.prompt, memoized.value.history);
        return toResponseParts(continuation);
      } else {
        if (!options.allowGeneration) {
          return yield* throwErrorWithClosestMatch(store, conversation);
        }

        const chat = yield* Chat.empty;

        const toolkit = Toolkit.make(...(params.tools as never[]));

        const upstreamResult = yield* chat
          .generateText({
            prompt: params.prompt,
            toolkit: yield* toolkit,
            toolChoice: params.toolChoice as any,
            disableToolCallResolution: true,
          })
          .pipe(Effect.provideService(LanguageModel.LanguageModel, options.upstreamModel));

        const newConversation: MemoziedConversation = {
          parameters: getMemoizedConversationParameters(options.modelName, params),
          history: yield* chat.history,
        };
        yield* store.saveMemoizedConversation(newConversation);

        return reinterpretResponseParts(upstreamResult.content);
      }
    }),
    streamText: (params) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const conversation = getConverstaionFromOptions(options.modelName, params);

          const memoized = yield* store.getMemoizedConversation(conversation);
          if (Option.isSome(memoized)) {
            const continuation = getContinuation(params.prompt, memoized.value.history);
            return toResponseStream(continuation);
          } else {
            if (!options.allowGeneration) {
              return yield* throwErrorWithClosestMatch(store, conversation);
            }

            const chat = yield* Chat.empty;

            const toolkit = Toolkit.make(...(params.tools as never[]));

            const stream = chat
              .streamText({
                prompt: params.prompt,
                toolkit: yield* toolkit,
                toolChoice: params.toolChoice as any,
                disableToolCallResolution: true,
              })
              .pipe(Stream.provideService(LanguageModel.LanguageModel, options.upstreamModel));

            // TODO(dmaretskyi): Better way to run code after the stream is finished?
            return stream.pipe(
              Stream.map(reinterpretStreamPart),
              Stream.concat(
                Stream.fromIterableEffect(
                  Effect.gen(function* () {
                    const conversation: MemoziedConversation = {
                      parameters: getMemoizedConversationParameters(options.modelName, params),
                      history: yield* chat.history,
                    };
                    yield* store.saveMemoizedConversation(conversation);

                    return [];
                  }),
                ),
              ),
            );
          }
        }),
      ),
  });
};

const getContinuation = (prompt: Prompt.Prompt, memoized: Prompt.Prompt): Prompt.Part[] => {
  const continuation = memoized.content.slice(prompt.content.length);
  const continuationParts = pipe(
    continuation,
    Array.takeWhile((message) => message.role === 'assistant'),
    Array.flatMap((message) => message.content),
  );
  invariant(continuationParts.length > 0, 'No message in continuation');
  return continuationParts;
};

const reinterpretResponseParts = (parts: Response.Part<Record<string, Tool.Any>>[]): Response.PartEncoded[] => {
  return parts.map((part): Response.PartEncoded => {
    switch (part.type) {
      case 'text':
        return Response.TextPart.pipe(Schema.encodeSync)(part);
      case 'reasoning':
        return Response.ReasoningPart.pipe(Schema.encodeSync)(part);
      case 'finish':
        return Response.FinishPart.pipe(Schema.encodeSync)(part);
      case 'response-metadata':
        return Response.ResponseMetadataPart.pipe(Schema.encodeSync)(part);
      case 'file':
        return Response.FilePart.pipe(Schema.encodeSync)(part);
      case 'source':
        switch (part.sourceType) {
          case 'url':
            return Response.UrlSourcePart.pipe(Schema.encodeSync)(part);
          case 'document':
            return Response.DocumentSourcePart.pipe(Schema.encodeSync)(part);
          default:
            throw new Error(`Unknown source type: ${(part as any).sourceType}`);
        }
      case 'tool-call':
        return {
          type: 'tool-call',
          id: part.id,
          name: part.name,
          params: part.params, // TODO: Pass params through the tool schema.
          metadata: part.metadata,
          providerExecuted: part.providerExecuted,
          providerName: part.providerName,
        };
      case 'tool-result':
        return {
          type: 'tool-result',
          id: part.id,
          name: part.name,
          result: part.result,
          metadata: part.metadata,
          providerExecuted: part.providerExecuted,
          providerName: part.providerName,
        };
      default:
        throw new Error(`Unknown part type: ${(part as any).type}`);
    }
  });
};

const reinterpretStreamPart = (part: Response.StreamPart<Record<string, Tool.Any>>): Response.StreamPartEncoded => {
  switch (part.type) {
    case 'text-start':
    case 'text-end':
    case 'text-delta':
      return part;
    case 'tool-params-start':
    case 'tool-params-end':
    case 'tool-params-delta':
      return part;
    case 'tool-call':
      return part;
    case 'tool-result':
      return part;
    case 'response-metadata':
      return Response.ResponseMetadataPart.pipe(Schema.encodeSync)(part);
    case 'finish':
      return Response.FinishPart.pipe(Schema.encodeSync)(part);
    default:
      throw new Error(`Unknown part type: ${(part as any).type}`);
  }
};

const toResponseParts = (parts: Prompt.Part[]): Response.PartEncoded[] => {
  return parts.map((part): Response.PartEncoded => {
    switch (part.type) {
      case 'text':
        return {
          type: 'text',
          metadata: part.options,
          text: part.text,
        };
      case 'reasoning':
        return {
          type: 'reasoning',
          metadata: part.options,
          text: part.text,
        };
      case 'tool-call':
        return {
          type: 'tool-call',
          id: part.id,
          name: part.name,
          params: part.params, // TODO: Pass params through the tool schema.
          metadata: part.options,
          providerExecuted: part.providerExecuted,
        };
      case 'tool-result':
        return {
          type: 'tool-result',
          id: part.id,
          name: part.name,
          result: part.result,
          metadata: part.options,
        };
      default:
        throw new Error(`Unknown part type: ${(part as any).type}`);
    }
  });
};

const toResponseStream = (continuation: Prompt.Part[]): Stream.Stream<Response.StreamPartEncoded> => {
  let idGenerator = 0;
  return Stream.fromIterable(
    continuation.flatMap((part): Response.StreamPartEncoded[] => {
      const id = String(idGenerator++);
      switch (part.type) {
        case 'text':
          return [
            {
              type: 'text-start',
              id,
              metadata: part.options,
            },
            {
              type: 'text-delta',
              id,
              delta: part.text,
            },
            {
              type: 'text-end',
              id,
            },
          ];
        case 'reasoning':
          return [
            {
              type: 'reasoning-start',
              id,
              metadata: part.options,
            },
            {
              type: 'reasoning-delta',
              id,
              delta: part.text,
            },
            {
              type: 'reasoning-end',
              id,
            },
          ];
        case 'tool-call':
          return [
            {
              type: 'tool-params-start',
              id: part.id,
              name: part.name,
              metadata: part.options,
              providerExecuted: part.providerExecuted,
            },
            {
              type: 'tool-params-delta',
              id: part.id,
              delta: JSON.stringify(part.params),
            },
            {
              type: 'tool-params-end',
              id: part.id,
            },
            // TODO(dmaretskyi): Do we need to send both?
            {
              type: 'tool-call',
              id: part.id,
              name: part.name,
              params: part.params,
              metadata: part.options,
              providerExecuted: part.providerExecuted,
            },
          ];
        case 'tool-result':
          return [
            {
              type: 'tool-result',
              id: part.id,
              name: part.name,
              result: part.result,
              metadata: part.options,
            },
          ];
        default:
          throw new Error(`Unknown part type: ${(part as any).type}`);
      }
    }),
  );
};

const getMemoizedConversationParameters = (
  model: string,
  params: LanguageModel.ProviderOptions,
): ConversationParameters => {
  return {
    model,
    tools: params.tools.map((tool) => ({
      name: tool.name,
      description: Tool.getDescription(tool as any),
      inputSchema: Tool.getJsonSchema(tool as any),
    })),
  };
};

const getConverstaionFromOptions = (model: string, params: LanguageModel.ProviderOptions): MemoziedConversation => {
  return {
    parameters: getMemoizedConversationParameters(model, params),
    history: params.prompt,
  };
};

const isPrefix = (haystack: MemoziedConversation, needle: MemoziedConversation): boolean => {
  if (
    haystack.parameters.model !== needle.parameters.model ||
    haystack.parameters.tools.length !== needle.parameters.tools.length
  ) {
    return false;
  }

  // TODO(dmaretskyi): This might not compare tools correctly.
  if (!isDeepStrictEqual(haystack.parameters.tools, needle.parameters.tools)) {
    return false;
  }

  if (haystack.history.content.length <= needle.history.content.length) {
    return false;
  }

  for (let i = 0; i < needle.history.content.length; i++) {
    if (!isDeepStrictEqual(haystack.history.content[i], needle.history.content[i])) {
      return false;
    }
  }

  if (haystack.history.content[needle.history.content.length].role !== 'assistant') {
    return false;
  }

  return true;
};

class MemoizedStore {
  #path: string;

  constructor(path: string) {
    this.#path = path;
  }

  /**
   * @returns A stored converstation that starts with the same parameters and messages as the prompted conversation.
   */
  getMemoizedConversation(prompted: MemoziedConversation): Effect.Effect<Option.Option<MemoziedConversation>> {
    return Effect.gen(this, function* () {
      const stored = yield* this.#loadStore();
      return pipe(
        stored.conversations,
        Array.sortBy(Order.mapInput(Order.number, (x) => x.history.content.length)),
        Array.findFirst((x) => isPrefix(x, prompted)),
      );
    });
  }

  /**
   * @returns A stored converstation that is the closest match to the prompted conversation.
   */
  getClosestMatch(prompted: MemoziedConversation): Effect.Effect<Option.Option<MemoziedConversation>> {
    return Effect.gen(this, function* () {
      const stored = yield* this.#loadStore();
      return pipe(
        stored.conversations,
        Array.sortBy(
          Order.mapInput(Order.number, (x) =>
            levensteinDistance(
              formatMemoizedConversation(x, prompted.history.content.length),
              formatMemoizedConversation(prompted, prompted.history.content.length),
            ),
          ),
        ),
        Option.fromIterable,
      );
    });
  }

  /**
   * Saves the conversation to the store.
   * @param conversation The conversation to save.
   */
  saveMemoizedConversation(conversation: MemoziedConversation): Effect.Effect<void> {
    return Effect.gen(this, function* () {
      const store = yield* this.#loadStore();
      store.conversations = store.conversations.filter((_) => !isPrefix(_, conversation));
      store.conversations.push(conversation);
      yield* this.#saveStore(store);
    });
  }

  #loadStore(): Effect.Effect<ConversationStore> {
    return Effect.promise(async () => {
      try {
        const data = await readFile(this.#path, 'utf-8');
        return Schema.decodeSync(Schema.parseJson(ConversationStore))(data);
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          return { conversations: [] };
        } else {
          throw err;
        }
      }
    });
  }

  #saveStore(store: ConversationStore): Effect.Effect<void> {
    // TODO(dmaretskyi): Figure out how to make this thread-safe.
    return Effect.promise(async () => {
      await writeFile(this.#path, Schema.encodeSync(Schema.parseJson(ConversationStore))(store));
    });
  }
}

const ConversationParameters = Schema.Struct({
  model: Schema.String,
  tools: Schema.Array(
    Schema.Struct({
      name: Schema.String,
      description: Schema.optional(Schema.String),
      inputSchema: Schema.Any,
    }),
  ),
});
type ConversationParameters = Schema.Schema.Type<typeof ConversationParameters>;

const MemoziedConversation = Schema.Struct({
  parameters: ConversationParameters,
  history: Prompt.Prompt,
});
type MemoziedConversation = Schema.Schema.Type<typeof MemoziedConversation>;

const ConversationStore = Schema.Struct({
  conversations: Schema.Array(MemoziedConversation).pipe(Schema.mutable),
}).pipe(Schema.mutable);
type ConversationStore = Schema.Schema.Type<typeof ConversationStore>;

const formatMemoizedConversation = (conversation: MemoziedConversation, historyLength: number): string => {
  let buf = '';
  buf += JSON.stringify(conversation.parameters, null, 2) + '\n\n';
  for (const message of conversation.history.content.slice(0, historyLength)) {
    buf += `[${message.role}]\n`;
    for (const part of message.content) {
      switch (message.role) {
        case 'system':
          buf += message.content + '\n';
          break;
        case 'user':
        case 'assistant':
        case 'tool':
          for (const part of message.content) {
            switch (part.type) {
              case 'text':
                buf += part.text + '\n';
                break;
              case 'reasoning':
                buf += `<reasoning>${part.text}</reasoning>`;
                break;
              case 'tool-call':
                buf += JSON.stringify(part.params) + '\n';
                break;
              case 'tool-result':
                buf += JSON.stringify(part.result) + '\n';
                break;
            }
          }
          break;
      }
    }
  }
  return buf;
};

const levensteinDistance = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;

  if (m === 0) {
    return n;
  }
  if (n === 0) {
    return m;
  }

  const dp = Array.replicate(0, m + 1).map(() => Array.replicate(0, n + 1));

  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }

  return dp[m][n];
};

const throwErrorWithClosestMatch = (store: MemoizedStore, conversation: MemoziedConversation) =>
  Effect.gen(function* () {
    const closestMatch = yield* store.getClosestMatch(conversation);
    if (Option.isSome(closestMatch)) {
      const patch = createPatch(
        'converstaion',
        formatMemoizedConversation(closestMatch.value, conversation.history.content.length),
        formatMemoizedConversation(conversation, conversation.history.content.length),
        'saved',
        'new',
      );
      return yield* Effect.dieMessage(`No memoized conversation found for the given prompt. Closest match:\n${patch}`);
    }
    return yield* Effect.dieMessage('No memoized conversation found for the given prompt.');
  });
