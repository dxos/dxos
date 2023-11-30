//
// Copyright 2023 DXOS.org
//

import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';

import { str } from '../../../util';
import { type SequenceGenerator, type SequenceTest } from '../request';

export const test: SequenceTest = ({ object }) => object?.__typename === 'braneframe.Grid';

export const generator: SequenceGenerator = (resources, getContext) => {
  return RunnableSequence.from([
    {
      // TODO(burdon): Use zod (incl. descriptions).
      // TODO(burdon): Only fill at most three fields (needs to be adaptive otherwise will hallucinate).
      fields: () => {
        const { schema } = getContext();
        return schema?.props
          .slice(0, 3)
          .map(({ id }) => id)
          .join(',');
      },
      question: new RunnablePassthrough(),
    },
    PromptTemplate.fromTemplate(
      str(
        'You are a machine that only replies with valid, iterable RFC8259 compliant JSON in your responses',
        'Your entire response should be a single array of JSON objects.',
        'Each item should contain the following fields: {fields}',
        '---',
        '{question}',
      ),
    ),
    resources.chat,
    new StringOutputParser(),
  ]);
};
