//
// Copyright 2023 DXOS.org
//

import { type ChatCompletionRequestMessage } from 'openai';

import { type Thread } from '@braneframe/types';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type Schema } from '@dxos/echo-schema';

type SchemaConfig = {
  typename: string;
  allowedFields: string[];
};

type SchemaDef = {
  config: SchemaConfig;
  schema: Schema;
};

const SCHEMA_CONFIG: SchemaConfig[] = [
  {
    typename: 'braneframe.Grid.Item',
    allowedFields: ['title', 'content', 'color'],
  },
];

const formatSchema = ({ schema, config }: SchemaDef) => {
  const props =
    !config || config.allowedFields.length === 0
      ? schema.props
      : schema.props.filter((prop) => config?.allowedFields.includes(prop.id!));

  return `
    @type: ${schema.typename}
    fields:
      ${props.map((prop) => `${prop.id}: ${prop.type}`).join('\n      ')}
    \n
  `;
};

export const createRequest = (client: Client, space: Space, block: Thread.Block): ChatCompletionRequestMessage[] => {
  // TODO(burdon): Pass in history.
  // TODO(burdon): Error handling (e.g., 401);
  const messages: ChatCompletionRequestMessage[] = [];

  const schemas = SCHEMA_CONFIG.map((config) => ({
    config,
    schema: client.experimental.types.getSchema(config.typename)!,
  })).filter(Boolean);

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
      ${schemas.map(({ config, schema }) => (schema ? formatSchema({ schema, config }) : '')).join('\n')}
      `,
  });

  messages.push(
    ...block.messages.map((message): ChatCompletionRequestMessage => {
      let content = '';
      const contextObject = message.data && space.db.query({ id: message.data }).objects[0];
      if (contextObject && contextObject.__typename === 'dxos.experimental.chess.Game') {
        content += '\n' + 'I am playing chess. And current game history is: ' + contextObject.pgn + '.\n';
      }

      if (message.text) {
        content += message.text + '\n';
      }

      return { role: 'user', content };
    }),
  );

  return messages;
};
