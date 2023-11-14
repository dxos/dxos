//
// Copyright 2023 DXOS.org
//

import { ChatMessage } from 'langchain/schema';

import { type PromptGenerator } from '../prompts';

// TODO(burdon): This prompt could be used to augment other prompts.
// TODO(burdon): Schema format via function calling (ChatGPT only).

const handler: PromptGenerator = ({ message, schema }) => {
  if (!schema) {
    return null;
  }

  return [
    new ChatMessage('You are a helpful assistant.', 'system'),
    new ChatMessage(
      [
        'You are a machine that only replies with valid, iterable RFC8259 compliant JSON in your responses',
        'Your entire response should be a single array of JSON objects.',
        `Each item should contain the following fields: ${schema.props.map(({ id }) => id).join(',')}.`,
        // ...schema.props
        //   .map(({ id, description }) => description && `The field "${id}" should be the ${description}`)
        //   .filter(Boolean),
      ].join(' '),
      'system',
    ),
    new ChatMessage(message, 'user'),
  ];
};

export default handler;
