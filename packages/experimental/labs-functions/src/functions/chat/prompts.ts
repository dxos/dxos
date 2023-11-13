//
// Copyright 2023 DXOS.org
//

import { ChatMessage } from 'langchain/schema';

// TODO(burdon): https://js.langchain.com/docs/get_started/introduction
//  https://www.npmjs.com/package/langchain
//  https://js.langchain.com/docs/integrations/chat/openai

// TODO(burdon): Use ECHO type.
export type Schema = {
  fields: {
    name: string;
    description?: string;
    type: 'string' | 'number';
  }[];
};

export type PromptGenerator = (props: { message: string; context?: any; schema?: Schema }) => ChatMessage[] | null;

// TODO(burdon): Prompt factory.
export const prompts: PromptGenerator[] = [
  //
  // Schema
  //
  ({ message, schema }) => {
    if (!schema) {
      return null;
    }

    return [
      new ChatMessage('You are a helpful assistant.', 'system'),
      // TODO(burdon): Schema format via function calling (ChatGPT only).
      // https://community.openai.com/t/getting-response-data-as-a-fixed-consistent-json-response/28471/32
      new ChatMessage(
        [
          'You are a machine that only returns and replies with valid, iterable RFC8259 compliant JSON in your responses',
          `Each item should contain the following fields: ${schema.fields.map(({ name }) => name).join(',')}.`,
          ...schema.fields
            .map(({ name, description }) => description && `The field "${name}" should be the ${description}`)
            .filter(Boolean),
        ].join(' '),
        'user',
      ),
      new ChatMessage(message, 'user'),
    ];
  },

  //
  // Chess
  //
  ({ message, context }) => {
    // TODO(burdon): Test typename.
    if (!context?.pgn) {
      return null;
    }

    return [
      new ChatMessage('You are a helpful assistant.', 'system'),
      new ChatMessage([`I am currently playing chess and the move history is ${context.pgn}`].join(' '), 'user'),
      new ChatMessage(message, 'user'),
    ];
  },
];
