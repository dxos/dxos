//
// Copyright 2023 DXOS.org
//

import { type BaseChatModel, type BaseChatModelParams } from 'langchain/chat_models/base';
import { type Document } from 'langchain/document';
import { type EmbeddingsParams, type Embeddings } from 'langchain/embeddings/base';
import { type VectorStore } from 'langchain/vectorstores/base';
import { FaissStore } from 'langchain/vectorstores/faiss';
import fs from 'node:fs';
import { join } from 'node:path';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type ChainDocument = Document & {
  metadata: {
    space?: string;
    id: string;
  };
};

const metaKey = ({ space, id }: ChainDocument['metadata']) => `${space ?? ''}/${id}`;

const VERSION = 1;
const INDEX_FILE = 'dxos_index.json';

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
  // TODO(burdon): Factor out vector store abstraction.
  private _vectorStore?: FaissStore;
  // Map of <space, id> to vector document id.
  private _vectorIndex = new Map<string, string>();

  constructor(
    public readonly embeddings: Embeddings,
    public readonly chat: BaseChatModel,
    private readonly _options: ChainResourcesOptions<E, M> = {},
  ) {}

  get stats() {
    return {
      version: VERSION,
      documents: this._vectorIndex.size,
    };
  }

  get vectorStore(): VectorStore {
    invariant(this._vectorStore);
    return this._vectorStore;
  }

  async initialize() {
    try {
      if (this._options.baseDir) {
        this._vectorStore = await FaissStore.load(this._options.baseDir, this.embeddings);

        // Check version.
        const { version, index } = JSON.parse(fs.readFileSync(join(this._options.baseDir, INDEX_FILE), 'utf8'));
        if (version !== VERSION) {
          throw new Error(`Invalid version (expected: ${VERSION}; got: ${version})`);
        }

        this._vectorIndex = new Map(index);
      }
    } catch (err: any) {
      log.error('Corrupt store', { path: this._options.baseDir, version: VERSION, error: String(err) });
    }

    if (!this._vectorStore) {
      this._vectorStore = await FaissStore.fromDocuments([], this.embeddings);
      log.info('ok', { path: this._options.baseDir, version: VERSION });
    }

    return this;
  }

  async save() {
    invariant(this._options.baseDir);
    invariant(this._vectorStore);
    log.info('saving...');
    await this._vectorStore.save(this._options.baseDir);

    const data = JSON.stringify({ version: VERSION, index: Array.from(this._vectorIndex.entries()) });
    fs.writeFileSync(join(this._options.baseDir, INDEX_FILE), data);
    return this;
  }

  async delete() {
    invariant(this._options.baseDir);
    fs.rmSync(this._options.baseDir, { recursive: true, force: true });
    return this;
  }

  // TODO(burdon): Split into chunks?
  // TODO(burdon): Store hash to check document has changed.
  async addDocuments(docs: ChainDocument[]) {
    invariant(this._vectorStore);
    log.info('addDocuments', { count: docs.length });
    const documentIds = docs
      .map(({ metadata }) => this._vectorIndex.get(metaKey(metadata)))
      .filter(Boolean) as string[];
    if (documentIds.length) {
      await this._vectorStore.delete({ ids: documentIds });
    }

    {
      const documentIds = (await this.vectorStore.addDocuments(docs)) as string[];
      for (let i = 0; i < documentIds.length; ++i) {
        this._vectorIndex.set(metaKey(docs[i].metadata), documentIds[i]);
      }
    }
    log.info('ok');
  }

  async deleteDocuments(meta: ChainDocument['metadata'][]) {
    invariant(this._vectorStore);
    log.info('deleteDocuments', { count: meta.length });
    const documentIds = meta
      .map((metadata) => {
        const id = metaKey(metadata);
        const documentId = this._vectorIndex.get(id);
        if (documentId) {
          this._vectorIndex.delete(id);
        }
        return documentId;
      })
      .filter(Boolean) as string[];

    if (documentIds.length) {
      await this._vectorStore.delete({ ids: documentIds });
    }
    log.info('ok');
  }
}
