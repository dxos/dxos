//
// Copyright 2023 DXOS.org
//

import { PromptTemplate } from 'langchain/prompts';
import { StringOutputParser } from 'langchain/schema/output_parser';
import { RunnablePassthrough, RunnableSequence } from 'langchain/schema/runnable';

import { str } from '../../../util';
import { type SequenceGenerator, type SequenceTest } from '../processor';

export const test: SequenceTest = ({ object }) => object?.__typename === 'dxos.experimental.chess.Game';

export const generator: SequenceGenerator = (resources, getContext) => {
  return RunnableSequence.from([
    {
      history: () => {
        const { object } = getContext();
        return object?.pgn ?? ''; // TODO(burdon): Change property.
      },
      question: new RunnablePassthrough(),
    },
    PromptTemplate.fromTemplate(
      str(
        'You are a machine that is an expert chess player.',
        'The move history of the current game: {history}',
        'If asked to suggest a move explain why it is a good move.',
        '---',
        '{question}',
      ),
    ),
    resources.chat,
    new StringOutputParser(),
  ]);
};
