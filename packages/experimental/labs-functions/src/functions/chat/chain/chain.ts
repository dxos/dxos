//
// Copyright 2023 DXOS.org
//

import { type BaseChatModel } from 'langchain/chat_models/base';
import { ChatOpenAI, type OpenAIChatInput } from 'langchain/chat_models/openai';
import { type Embeddings } from 'langchain/embeddings/base';
import { type OpenAIEmbeddingsParams } from 'langchain/embeddings/openai';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';
import { formatDocumentsAsString } from 'langchain/util/document';
import { type VectorStore } from 'langchain/vectorstores/base';
import { HNSWLib } from 'langchain/vectorstores/hnswlib';

import { invariant } from '@dxos/invariant';

export type ChainOptions = {
  apiKey: string;
  // TODO(burdon): Generalize?
  embeddings?: Partial<OpenAIEmbeddingsParams>;
  chat?: Partial<OpenAIChatInput>;
};

export class ChainResources {
  public readonly embeddings: Embeddings;
  public readonly chat: BaseChatModel;

  private _vectorStore?: VectorStore;

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

  get vectorStore() {
    invariant(this._vectorStore);
    return this._vectorStore;
  }

  async initialize() {
    this._vectorStore = await HNSWLib.fromDocuments([], this.embeddings);
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

  async call(text: string) {
    return await this._agent.invoke(text);
  }
}
