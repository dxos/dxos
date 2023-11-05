//
// Copyright 2023 DXOS.org
//

import { type ChatCompletionRequestMessage } from 'openai';

import { type Thread } from '@braneframe/types';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { type Schema, type TypedObject } from '@dxos/echo-schema';

// TODO(burdon): Tests.

export type SchemaConfig = {
  typename: string;
  fields: string[];
};

// TODO(burdon): Generate based on context.
const schemaConfigs: SchemaConfig[] = [
  {
    typename: 'braneframe.Grid.Item',
    fields: ['title', 'content'],
  },
];

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

// TODO(burdon): Request builder.
export const createRequest = (client: Client, space: Space, block: Thread.Block): ChatCompletionRequestMessage[] => {
  let contextObject: TypedObject | undefined;
  if (block?.context.object) {
    const { objects } = space.db.query({ id: block.context.object });
    contextObject = objects[0];
  }

  const messages: ChatCompletionRequestMessage[] = [
    {
      role: 'system',
      content: 'you are a helpful assistant.',
    },
  ];

  //
  // Grid
  //
  // TODO(burdon): Get schema from context.
  if (contextObject?.__typename === 'braneframe.Grid') {
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
          // TODO(burdon): ???
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

  //
  // Chess
  //
  if (contextObject?.__typename === 'dxos.experimental.chess.Game') {
    messages.push({
      role: 'user',
      content: `I am playing chess and the current game history is: [${contextObject.pgn}]`,
    });
  }

  block.messages.forEach((message) => {
    if (message.text) {
      messages.push({ role: 'user', content: message.text });
    }
  });

  return messages;
};

// TODO(burdon): Plugin rules.
export class RequestBuilder {
  private readonly _messages: ChatCompletionRequestMessage[] = [
    {
      role: 'system',
      content: 'you are a helpful assistant.',
    },
  ];

  constructor(private readonly _client: Client) {}

  build(): ChatCompletionRequestMessage[] {
    return this._messages;
  }
}
