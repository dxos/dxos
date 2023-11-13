//
// Copyright 2023 DXOS.org
//

import { ChatMessage } from 'langchain/schema';

import { type Schema } from '@dxos/echo-schema';

// TODO(burdon): Investigate libs.
//  https://js.langchain.com/docs/integrations/chat/openai

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
          'You are a machine that only replies with valid, iterable RFC8259 compliant JSON in your responses',
          `Each item should contain the following fields: ${schema.props.map(({ id }) => id).join(',')}.`,
          ...schema.props
            .map(({ id, description }) => description && `The field "${id}" should be the ${description}`)
            .filter(Boolean),
          'Your entire response should be a single array of JSON objects.',
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
      new ChatMessage('You are a machine and a helpful assistant that is an expert chess player.', 'system'),
      new ChatMessage([`I am currently playing chess and the move history is ${context.pgn}`].join(' '), 'user'),
      new ChatMessage('First suggest a move, then write one sentence about why this is a good move.', 'user'),
      new ChatMessage(message, 'user'),
    ];
  },
];

export const defaultPrompt: PromptGenerator = ({ message }) => [
  new ChatMessage('You are a helpful assistant.', 'system'),
  new ChatMessage(message, 'user'),
];
