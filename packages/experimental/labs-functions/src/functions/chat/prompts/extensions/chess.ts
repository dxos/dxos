//
// Copyright 2023 DXOS.org
//

import { ChatMessage } from 'langchain/schema';

import { type PromptGenerator } from '../prompts';

const handler: PromptGenerator = ({ message, context }) => {
  // TODO(burdon): Test typename.
  if (!context?.pgn) {
    return null;
  }

  return [
    new ChatMessage('You are a machine and a helpful assistant that is an expert chess player.', 'system'),
    new ChatMessage([`I am currently playing chess and the move history is ${context.pgn}`].join(' '), 'user'),
    new ChatMessage('First suggest a move, then write one sentence about why this is a good move.', 'user'),
    new ChatMessage(message, 'user'),
  ];
};

export default handler;
