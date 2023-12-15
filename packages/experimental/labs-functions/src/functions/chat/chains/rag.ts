//
// Copyright 2023 DXOS.org
//

import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';
import { formatDocumentsAsString } from 'langchain/util/document';

import { str } from '../../../util';
import { type SequenceGenerator, type SequenceTest } from '../request';

export const test: SequenceTest = () => true;

// export const formatDocumentsAsString = (documents: Document[], separator = '\n\n'): string => {
//   return documents?.map((doc) => doc.pageContent).join(separator);
// };

export const generator: SequenceGenerator = (resources, _, options) => {
  const retriever = resources.store.vectorStore.asRetriever({});

  return RunnableSequence.from([
    {
      context: retriever.pipe(formatDocumentsAsString),
      question: new RunnablePassthrough(),
    },
    PromptTemplate.fromTemplate(
      str(
        'be brief',
        options?.noTrainingData
          ? "answer the question based only on the following context and say if you don't know the answer"
          : 'answer the question using the following context as well as your training data:',
        '{context}',
        '---',
        'question: {question}',
      ),
    ),
    resources.chat,
    new StringOutputParser(),
  ]);
};
