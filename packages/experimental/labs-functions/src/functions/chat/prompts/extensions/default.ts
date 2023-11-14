//
// Copyright 2023 DXOS.org
//

import { ChatMessage } from 'langchain/schema';

import { type PromptGenerator } from '../prompts';

const handler: PromptGenerator = ({ message }) => {
  // prettier-ignore
  return [
    new ChatMessage('You are a helpful assistant.', 'system'),
    new ChatMessage(message, 'user')
  ];
};

export default handler;
