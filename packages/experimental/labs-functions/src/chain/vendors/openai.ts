//
// Copyright 2023 DXOS.org
//

import type { BaseChatModelParams } from 'langchain/chat_models/base';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { OpenAIEmbeddings, type OpenAIEmbeddingsParams } from 'langchain/embeddings/openai';
import defaultsDeep from 'lodash.defaultsdeep';

import { ChainResources, type ChainResourcesFactory, type ChainResourcesOptions } from '../resources';

// NOTE: Not exported (partially copied from source).
export declare interface OpenAIBaseInput {
  temperature: number;
  maxTokens?: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  n: number;
  logitBias?: Record<string, number>;
  user?: string;
  streaming: boolean;
  modelName: string;
  modelKwargs?: Record<string, any>;
  stop?: string[];
  timeout?: number;
  openAIApiKey?: string;
}

export const defaultOpenAIBaseInput: Partial<OpenAIBaseInput> = {
  modelName: 'gpt-4-1106-preview',
};

export type OpenAIChainResourcesOptions = ChainResourcesOptions<
  OpenAIEmbeddingsParams,
  OpenAIBaseInput & BaseChatModelParams
>;

/**
 * https://github.com/openai/openai-node
 * https://platform.openai.com/docs/models
 */
export const createOpenAIChainResources: ChainResourcesFactory<
  OpenAIEmbeddingsParams,
  OpenAIBaseInput & BaseChatModelParams
> = (options: OpenAIChainResourcesOptions) => {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: options.apiKey,
    ...options.embeddings,
  });

  const chat = new ChatOpenAI(
    defaultsDeep(
      {
        openAIApiKey: options.apiKey,
        ...options.chat,
      },
      defaultOpenAIBaseInput,
    ),
  );

  return new ChainResources('openai', embeddings, chat, options);
};
