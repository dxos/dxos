//
// Copyright 2023 DXOS.org
//

import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';
import { formatDocumentsAsString } from 'langchain/util/document';

import { type ChainResources } from './resources';

export type ChainOptions = {
  precise?: boolean;
};

export class Chain {
  private readonly _chain: RunnableSequence;

  constructor(private readonly _resources: ChainResources, private readonly _options: ChainOptions = {}) {
    const retriever = this._resources.store.vectorStore.asRetriever();

    // TODO(burdon): Construct different chains on the fly?
    const promptTemplate = PromptTemplate.fromTemplate(
      [
        this._options.precise
          ? 'answer the question based only on the following context:'
          : 'try to be brief and answer the question using the following context otherwise just answer directly from your training data:',
        '{context}',
        '----------------',
        'question: {question}',
      ]
        .flat()
        .join('\n'),
    );

    this._chain = RunnableSequence.from([
      // Inputs to prompt template.
      {
        context: retriever.pipe(formatDocumentsAsString),
        question: new RunnablePassthrough(),
      },
      promptTemplate,
      this._resources.chat,
      new StringOutputParser(),
    ]);
  }

  async call(inputText: string) {
    return await this._chain.invoke(inputText);
  }
}
