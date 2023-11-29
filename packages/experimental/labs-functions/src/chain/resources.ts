//
// Copyright 2023 DXOS.org
//

import { type BaseChatModel, type BaseChatModelParams } from 'langchain/chat_models/base';
import { type EmbeddingsParams, type Embeddings } from 'langchain/embeddings/base';

import { ChainStore } from './store';

export type ChainResourcesOptions<E extends EmbeddingsParams, M extends BaseChatModelParams> = {
  baseDir?: string;
  apiKey?: string;

  // https://js.langchain.com/docs/integrations/text_embedding
  embeddings?: Partial<E>;

  // https://js.langchain.com/docs/integrations/chat
  // https://github.com/jmorganca/ollama#model-library
  // https://platform.openai.com/docs/models
  chat?: Partial<M>;
};

export type ChainResourcesFactory<E extends EmbeddingsParams, M extends BaseChatModelParams> = (
  options: ChainResourcesOptions<E, M>,
) => ChainResources<E, M>;

export class ChainResources<
  E extends EmbeddingsParams = EmbeddingsParams,
  M extends BaseChatModelParams = BaseChatModelParams,
> {
  private readonly _store: ChainStore;

  constructor(
    private readonly _id: string,
    private readonly _embeddings: Embeddings,
    private readonly _chat: BaseChatModel,
    private readonly _options: ChainResourcesOptions<E, M> = {},
  ) {
    this._store = new ChainStore(this._embeddings, { id: this._id, baseDir: this._options.baseDir });
  }

  get info() {
    return {
      store: this._store.info,
      options: this._options,
    };
  }

  get embeddings() {
    return this._embeddings;
  }

  get chat() {
    return this._chat;
  }

  get store() {
    return this._store;
  }
}
