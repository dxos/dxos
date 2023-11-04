//
// Copyright 2023 DXOS.org
//

import { type ChatCompletionRequestMessage } from 'openai';

import { type Thread } from '@braneframe/types';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type Schema } from '@dxos/echo-schema';

// TODO(burdon): Tests.

export type SchemaConfig = {
  typename: string;
  fields: string[];
};

const formatSchema = (config: SchemaConfig, schema: Schema) => {
  const props =
    !config || config.fields.length === 0
      ? schema.props
      : schema.props.filter((prop) => config?.fields.includes(prop.id!));

  return `
    @type: ${schema.typename}
    fields:
      ${props.map((prop) => `${prop.id}: ${prop.type}`).join('\n')}
    \n
  `;
};

export const createRequest = (
  client: Client,
  space: Space,
  block: Thread.Block,
  schemaConfigs: SchemaConfig[],
): ChatCompletionRequestMessage[] => {
  const messages: ChatCompletionRequestMessage[] = [
    {
      role: 'system',
      content: 'you are a helpful assistant.',
    },
  ];

  // Output format.
  if (schemaConfigs.length) {
    messages.push({
      role: 'system',
      content: `
      In your replies you can choose to output lists and only lists in a structured format.
      Structured data is formatted as an array of JSON objects conforming to the schema.
      Include "@type" field with the exact name of one of the provided schema types.
      In structured mode do not include any other text in your replies, just a single JSON block.
      Include real data in your replies, not just the schema.
      Try to fill all fields if reasonable data can be provided.
      Example:
      [{
        "@type": "project.Example.Type",
        "title": "hypercore",
        "content": "hypercore is a protocol and network for distributing and replicating static feeds"
      }]

      Available schema types:
      ${schemaConfigs
        .map((config) => {
          const schema = client.experimental.types.getSchema(config.typename);
          if (schema) {
            return formatSchema(config, schema);
          }

          return undefined;
        })
        .filter(Boolean)
        .join('\n')}
      `,
    });
  }

  // Context.
  messages.push(
    ...block.messages.map((message): ChatCompletionRequestMessage => {
      // TODO(burdon): Add context to message block; use ref.
      const contextObject = message.data && space.db.query({ id: message.data }).objects[0];
      console.log('request', { contextObject });

      let content = '';
      if (contextObject && contextObject.__typename === 'dxos.experimental.chess.Game') {
        content += '\n' + 'I am playing chess and current game history is: ' + contextObject.pgn + '.\n';
      }

      if (message.text) {
        content += message.text + '\n';
      }

      return { role: 'user', content };
    }),
  );

  return messages;
};
