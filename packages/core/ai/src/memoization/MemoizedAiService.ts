import { LanguageModel, Prompt, Tool } from '@effect/ai';
import type * as AiService from '../AiService';
import { Effect, Layer, Schema, type Context, Option } from 'effect';
import { todo } from '@dxos/debug';

export interface MemoizedAiService extends AiService.Service {}

export interface MakeOptions {
  upstream: AiService.Service;
  /**
   * Filename for memoized conversations to be stored at.
   */
  storePath: string;
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
          });
        }),
      ),
  };
};

interface MakeModelOptions {
  upstreamModel: LanguageModel.Service;
  modelName: string;
  storePath: string;
}

const makeModel = (options: MakeModelOptions): Effect.Effect<LanguageModel.Service> => {
  const store = new MemoizedStore(options.storePath);

  return LanguageModel.make({
    generateText: Effect.fn('MemoizedLanguageModel.generateText')(function* (params) {
      const conversation = getConverstaionFromOptions(options.modelName, params);
      const continuation = yield* store.getContinuation(conversation);
      if (Option.isSome(continuation)) {
      }
      return todo();
    }),
    streamText: (params) => {
      return todo();
    },
  });
};

const getConversationParameters = (model: string, params: LanguageModel.ProviderOptions): ConversationParameters => {
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
    model,
    history: params.prompt,
  };
};

class MemoizedStore {
  #path: string;

  constructor(path: string) {
    this.#path = path;
  }

  getContinuation(conversation: MemoziedConversation): Effect.Effect<Option.Option<MemoziedConversation>> {
    return todo();
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
  model: Schema.String,
  history: Prompt.Prompt,
});
type MemoziedConversation = Schema.Schema.Type<typeof MemoziedConversation>;
