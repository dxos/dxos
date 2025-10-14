//
// Copyright 2025 DXOS.org
//

import { AiError, LanguageModel, Prompt, Response, Tool, Toolkit } from '@effect/ai';
import { createPatch } from 'diff';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Order from 'effect/Order';
import * as pipe from 'effect/pipe';
import * as Schema from 'effect/Schema';
import * as Stream from 'effect/Stream';
import jsonStableStringify from 'json-stable-stringify';

export interface LayerOptions {
  modelName: string;
  storePath: string;
  allowGeneration: boolean;
}

export const layer = (
  options: LayerOptions,
): Layer.Layer<LanguageModel.LanguageModel, never, LanguageModel.LanguageModel> =>
  Layer.effect(
    LanguageModel.LanguageModel,
    Effect.gen(function* () {
      const upstreamModel = yield* LanguageModel.LanguageModel;
      return yield* make({
        upstreamModel,
        modelName: options.modelName,
        storePath: options.storePath,
        allowGeneration: options.allowGeneration,
      });
    }),
  );

export interface MakeModelOptions {
  upstreamModel: LanguageModel.Service;
  modelName: string;
  storePath: string;
  allowGeneration: boolean;
}

export const make = (options: MakeModelOptions): Effect.Effect<LanguageModel.Service> => {
  const store = new MemoizedStore(options.storePath);

  return LanguageModel.make({
    generateText: Effect.fn('MemoizedLanguageModel.generateText')(function* (params) {
      const conversation = getConverstaionFromOptions(options.modelName, false, params);
      const memoized = yield* store.getMemoizedConversation(conversation);
      if (Option.isSome(memoized)) {
        return memoized.value.response as Response.PartEncoded[];
      } else {
        if (!options.allowGeneration) {
          return yield* throwErrorWithClosestMatch(store, conversation);
        }

        const toolkit = Toolkit.make(...(params.tools as never[]));

        const upstreamResult = yield* options.upstreamModel.generateText({
          prompt: params.prompt,
          toolkit: yield* toolkit,
          toolChoice: params.toolChoice as any,
          disableToolCallResolution: true,
        });
        const response = yield* Schema.mutable(Schema.Array(Response.Part(toolkit)))
          .pipe(Schema.encode)(upstreamResult.content)
          .pipe(
            Effect.catchTag('ParseError', (error) =>
              AiError.MalformedOutput.fromParseError({
                module: 'LanguageModel',
                method: 'generateText',
                error,
              }),
            ),
          );

        const newConversation: MemoziedConversation = {
          parameters: getMemoizedConversationParameters(options.modelName, false, params),
          prompt: params.prompt,
          response,
        };
        yield* store.saveMemoizedConversation(newConversation);

        return response;
      }
    }),
    streamText: (params) =>
      Stream.unwrap(
        Effect.gen(function* () {
          const conversation = getConverstaionFromOptions(options.modelName, true, params);

          const memoized = yield* store.getMemoizedConversation(conversation);
          if (Option.isSome(memoized)) {
            return Stream.fromIterable(memoized.value.response as Response.StreamPartEncoded[]);
          } else {
            if (!options.allowGeneration) {
              return yield* throwErrorWithClosestMatch(store, conversation);
            }

            const toolkit = Toolkit.make(...(params.tools as never[]));
            const PartCodec = Response.StreamPart(toolkit);

            const parts: Response.AllPartsEncoded[] = [];
            return options.upstreamModel
              .streamText({
                prompt: params.prompt,
                toolkit: yield* toolkit,
                toolChoice: params.toolChoice as any,
                disableToolCallResolution: true,
              })
              .pipe(
                Stream.mapEffect((part) =>
                  Schema.encode(PartCodec)(part).pipe(
                    Effect.catchTag('ParseError', (error) =>
                      AiError.MalformedOutput.fromParseError({
                        module: 'LanguageModel',
                        method: 'generateText',
                        error,
                      }),
                    ),
                  ),
                ),
                Stream.mapChunksEffect(
                  Effect.fnUntraced(function* (chunk) {
                    parts.push(...chunk);
                    return chunk;
                  }),
                ),
                Stream.onEnd(
                  Effect.gen(function* () {
                    const conversation: MemoziedConversation = {
                      parameters: getMemoizedConversationParameters(options.modelName, true, params),
                      prompt: params.prompt,
                      response: parts,
                    };
                    yield* store.saveMemoizedConversation(conversation);
                  }),
                ),
              );
          }
        }),
      ),
  });
};

const getMemoizedConversationParameters = (
  model: string,
  stream: boolean,
  params: LanguageModel.ProviderOptions,
): ConversationParameters => {
  return {
    model,
    stream,
    tools: params.tools.map((tool) => ({
      name: tool.name,
      description: Tool.getDescription(tool as any),
      inputSchema: Tool.getJsonSchema(tool as any),
    })),
  };
};

const getConverstaionFromOptions = (
  model: string,
  stream: boolean,
  params: LanguageModel.ProviderOptions,
): MemoziedConversation => {
  return {
    parameters: getMemoizedConversationParameters(model, stream, params),
    prompt: params.prompt,
    response: [],
  };
};

const converstationMatches = (haystack: MemoziedConversation, needle: MemoziedConversation): boolean => {
  // TODO(dmaretskyi): dequal doesn't work for some reason.
  if (jsonStableStringify(haystack.parameters) !== jsonStableStringify(needle.parameters)) {
    return false;
  }

  if (jsonStableStringify(haystack.prompt) !== jsonStableStringify(needle.prompt)) {
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
        Array.findFirst((x) => converstationMatches(x, prompted)),
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
            levensteinDistance(formatMemoizedConversation(x), formatMemoizedConversation(prompted)),
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
      store.conversations.push(conversation);
      yield* this.#saveStore(store);
    });
  }

  #loadStore(): Effect.Effect<ConversationStore> {
    return Effect.promise(async () => {
      // Avoids importing FS in browser. We can use effect's fs layer instead.
      const { readFile } = await import('node:fs/promises');
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
      // Avoids importing FS in browser. We can use effect's fs layer instead.
      const { writeFile } = await import('node:fs/promises');
      await writeFile(this.#path, Schema.encodeSync(Schema.parseJson(ConversationStore))(store));
    });
  }
}

const ConversationParameters = Schema.Struct({
  model: Schema.String,
  stream: Schema.Boolean,
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
  prompt: Prompt.Prompt,

  // This is supposed to be Response.AllParts for arbitrary tools.
  // Tool call schema is generated based on the available tools so we can't use a static schema.
  response: Schema.Array(Schema.Unknown),
});
type MemoziedConversation = Schema.Schema.Type<typeof MemoziedConversation>;

const ConversationStore = Schema.Struct({
  conversations: Schema.Array(MemoziedConversation).pipe(Schema.mutable),
}).pipe(Schema.mutable);
type ConversationStore = Schema.Schema.Type<typeof ConversationStore>;

const formatMemoizedConversation = (conversation: MemoziedConversation): string => {
  return (
    jsonStableStringify(
      {
        parameters: conversation.parameters,
        prompt: conversation.prompt,
      },
      { space: 2 },
    ) ?? ''
  );
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
        formatMemoizedConversation(closestMatch.value),
        formatMemoizedConversation(conversation),
        'saved',
        'new',
      );
      return yield* Effect.dieMessage(
        `No memoized conversation found for the given prompt. Closest match:\n${patch}\n\nRe-run with ALLOW_LLM_GENERATION=1 to generate a new memoized conversation.`,
      );
    }
    return yield* Effect.dieMessage(
      'No memoized conversation found for the given prompt.\n\nRe-run with ALLOW_LLM_GENERATION=1 to generate a new memoized conversation.',
    );
  });
