//
// Copyright 2023 DXOS.org
//

import { type BaseChatModelParams } from 'langchain/chat_models/base';
import { ChatOllama } from 'langchain/chat_models/ollama';
import { type EmbeddingsParams } from 'langchain/embeddings/base';
import { OllamaEmbeddings } from 'langchain/embeddings/ollama';

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
export const createOllamaChainResources = (options: OllamaChainResourcesOptions) => {
  const embeddings = new OllamaEmbeddings({
    ...options.embeddings,
  });

  const chat = new ChatOllama({
    ...options.chat,
  });

  return new ChainResources(embeddings, chat, options);
};
