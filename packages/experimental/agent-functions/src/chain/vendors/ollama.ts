//
// Copyright 2023 DXOS.org
//

import { ChatOllama } from '@langchain/community/chat_models/ollama';
import { OllamaEmbeddings } from '@langchain/community/embeddings/ollama';
import { type BaseChatModelParams } from 'langchain/chat_models/base';
import { type EmbeddingsParams } from 'langchain/embeddings/base';
import defaultsDeep from 'lodash.defaultsdeep';

import { ChainResources, type ChainResourcesOptions } from '../resources';

// NOTE: Not exported (partially copied from source).
interface OllamaEmbeddingsParams extends EmbeddingsParams {
  model?: string;
  baseUrl?: string;
}

// NOTE: Not exported (partially copied from source).
export interface OllamaInput {
  embeddingOnly?: boolean;
  f16KV?: boolean;
  frequencyPenalty?: number;
  logitsAll?: boolean;
  lowVram?: boolean;
  mainGpu?: number;
  model?: string;
  baseUrl?: string;
  mirostat?: number;
  mirostatEta?: number;
  mirostatTau?: number;
  numBatch?: number;
  numCtx?: number;
  numGpu?: number;
  numGqa?: number;
  numKeep?: number;
  numThread?: number;
  penalizeNewline?: boolean;
  presencePenalty?: number;
  repeatLastN?: number;
  repeatPenalty?: number;
  ropeFrequencyBase?: number;
  ropeFrequencyScale?: number;
  temperature?: number;
  stop?: string[];
  tfsZ?: number;
  topK?: number;
  topP?: number;
  typicalP?: number;
  useMLock?: boolean;
  useMMap?: boolean;
  vocabOnly?: boolean;
}

export const defaultOllamaInput: Partial<OllamaInput> = {
  model: 'llama2',
};

export type OllamaChainResourcesOptions = ChainResourcesOptions<
  OllamaEmbeddingsParams,
  OllamaInput & BaseChatModelParams
>;

/**
 * Install and run: `ollama run llama2` (takes 5 mins).
 * https://ollama.ai/download
 * https://github.com/jmorganca/ollama#model-library
 * https://ai.meta.com/llama/get-started
 */
export const createOllamaChainResources = (options: OllamaChainResourcesOptions): ChainResources => {
  const embeddings = new OllamaEmbeddings({
    ...options.embeddings,
  });

  const chat = new ChatOllama(
    defaultsDeep(
      {
        ...options.chat,
      },
      defaultOllamaInput,
    ),
  );

  return new ChainResources('ollama', embeddings, chat, options);
};
