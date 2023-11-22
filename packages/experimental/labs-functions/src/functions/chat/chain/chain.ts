//
// Copyright 2023 DXOS.org
//

import fs from 'fs';
import { type BaseChatModel } from 'langchain/chat_models/base';
import { ChatOpenAI, type OpenAIChatInput } from 'langchain/chat_models/openai';
import { type Document } from 'langchain/document';
import { type Embeddings } from 'langchain/embeddings/base';
import { type OpenAIEmbeddingsParams } from 'langchain/embeddings/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';
import { formatDocumentsAsString } from 'langchain/util/document';
import { type VectorStore } from 'langchain/vectorstores/base';
import { FaissStore } from 'langchain/vectorstores/faiss';
import { join } from 'path';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type ChainDocument = Document & {
  metadata: {
    space?: string;
    id: string;
  };
};

const getId = ({ space, id }: ChainDocument['metadata']) => `${space ?? ''}/${id}`;

export type ChainOptions = {
  apiKey: string;

  // TODO(burdon): Generalize?
  embeddings?: Partial<OpenAIEmbeddingsParams>;
  chat?: Partial<OpenAIChatInput>;

  baseDir?: string;
};

const INDEX_FILE = 'document_index.json';

export class ChainResources {
  public readonly embeddings: Embeddings;
  public readonly chat: BaseChatModel;

  // TODO(burdon): Factor out store abstraction.
  private _vectorStore?: FaissStore;
  // Map of <space, id> to vector document id.
  private _vectorIndex = new Map<string, string>();

  constructor(private readonly _options: ChainOptions) {
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
        const index = JSON.parse(fs.readFileSync(join(this._options.baseDir, INDEX_FILE), 'utf8'));
        this._vectorIndex = new Map(index);
      }
    } catch (err: any) {
      log.warn('Corrupt store', err);
    }

    if (!this._vectorStore) {
      this._vectorStore = await FaissStore.fromDocuments([], this.embeddings);
    }

    return this;
  }

  async save() {
    invariant(this._options.baseDir && this._vectorStore);
    await this._vectorStore.save(this._options.baseDir);
    const index = JSON.stringify(Array.from(this._vectorIndex.entries()));
    fs.writeFileSync(join(this._options.baseDir, INDEX_FILE), index);
    return this;
  }

  async delete() {
    invariant(this._options.baseDir);
    fs.rmSync(this._options.baseDir, { recursive: true, force: true });
    return this;
  }

  // TODO(burdon): Split into chunks?
  async addDocuments(docs: ChainDocument[]) {
    invariant(this._vectorStore);
    const documentIds = docs.map(({ metadata }) => this._vectorIndex.get(getId(metadata))).filter(Boolean) as string[];
    if (documentIds.length) {
      await this._vectorStore.delete({ ids: documentIds });
    }

    {
      const documentIds = (await this.vectorStore.addDocuments(docs)) as string[];
      for (let i = 0; i < documentIds.length; ++i) {
        this._vectorIndex.set(getId(docs[i].metadata), documentIds[i]);
      }
    }
  }

  async deleteDocuments(meta: ChainDocument['metadata'][]) {
    invariant(this._vectorStore);
    const documentIds = meta
      .map((metadata) => {
        const id = getId(metadata);
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

export class Chain {
  private readonly _agent: RunnableSequence;

  constructor(private readonly _resources: ChainResources) {
    const retriever = this._resources.vectorStore.asRetriever();
    const prompt = PromptTemplate.fromTemplate(
      [
        'answer the question based only on the following context:',
        '{context}',
        '----------------',
        'question: {question}',
      ].join('\n'),
    );

    this._agent = RunnableSequence.from([
      {
        context: retriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      prompt,
      this._resources.chat,
      new StringOutputParser(),
    ]);
  }

  async call(inputText: string) {
    return await this._agent.invoke(inputText);
  }
}
