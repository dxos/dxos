//
// Copyright 2023 DXOS.org
//

import { type BaseChatModel } from 'langchain/chat_models/base';
import { ChatOpenAI, type OpenAIChatInput } from 'langchain/chat_models/openai';
import { type Document } from 'langchain/document';
import { type Embeddings } from 'langchain/embeddings/base';
import { type OpenAIEmbeddingsParams } from 'langchain/embeddings/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
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

export type ChainResourcesOptions = {
  apiKey: string;

  // TODO(burdon): Generalize?
  embeddings?: Partial<OpenAIEmbeddingsParams>;
  chat?: Partial<OpenAIChatInput>;

  baseDir?: string;
};

const VERSION = 1;
const INDEX_FILE = 'document_index.json';

export class ChainResources {
  public readonly embeddings: Embeddings;
  public readonly chat: BaseChatModel;

  // TODO(burdon): Factor out store abstraction.
  private _vectorStore?: FaissStore;
  // Map of <space, id> to vector document id.
  private _vectorIndex = new Map<string, string>();

  constructor(private readonly _options: ChainResourcesOptions) {
    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: _options.apiKey,
      ...this._options.embeddings,
    });

    this.chat = new ChatOpenAI({
      openAIApiKey: _options.apiKey,
      ...this._options.chat,
    });
  }

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
      log.error('Corrupt store', String(err));
    }

    if (!this._vectorStore) {
      this._vectorStore = await FaissStore.fromDocuments([], this.embeddings);
    }

    return this;
  }

  async save() {
    invariant(this._options.baseDir && this._vectorStore);
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
  }

  async deleteDocuments(meta: ChainDocument['metadata'][]) {
    invariant(this._vectorStore);
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
  }
}
