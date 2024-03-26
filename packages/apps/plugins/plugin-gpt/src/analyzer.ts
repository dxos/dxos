//
// Copyright 2024 DXOS.org
//

import OpenAI from 'openai';
import { type Chat } from 'openai/resources';

import { type DocumentType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { getTextContent, toJsonSchema, Schema, Expando, TextObject, getTypename } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type GptAnalyzerOptions = {
  apiKey: string;
};

export class GptAnalyzer {
  private readonly _client: OpenAI;

  constructor(private readonly _options: GptAnalyzerOptions) {
    invariant(this._options.apiKey);
    this._client = new OpenAI({
      apiKey: this._options.apiKey,
      dangerouslyAllowBrowser: true,
    });
  }

  async exec(space: Space, document: DocumentType) {
    const { objects: schemas } = space.db.query(Schema.filter());
    const text = getTextContent(document.content);
    log.info('analyzing...', { length: text?.length, schema: schemas.length });
    if (!text?.length || !schemas.length) {
      return;
    }

    const schemaMap = schemas.reduce((map, schema) => {
      const jsonSchema = toJsonSchema(schema);
      if (jsonSchema.title) {
        log.info(schema.typename);
        map.set(jsonSchema.title, jsonSchema);
      }

      return map;
    }, new Map());

    const messages: Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: [
          //
          'You are a machine that only replies with valid, iterable RFC8259 compliant JSON in your responses.',
          'Your entire response should be a single array of JSON objects.',
          'Each object should conform to one of the following schemas:',
          '---',
          Array.from(schemaMap.values()).map((schema) => JSON.stringify(schema)),
        ].join('\n'),
      },
      {
        role: 'user',
        content: [
          //
          'List all people and companies mentioned in the following text:',
          '---',
          text,
        ].join('\n'),
      },
    ];

    log.info('requesting...', { length: text?.length, schema: schemas.length });
    const response = await this._client.chat.completions.create({ model: 'gpt-4', messages });
    log.info('processing', { choices: response.choices.length });
    const result = response.choices[0];
    try {
      if (result.message.content) {
        const data = JSON.parse(result.message.content);
        for (const obj of data) {
          const schema = schemas.find((schema) => schema.typename === getTypename(obj));
          if (!schema) {
            log.warn('invalid object', { obj });
            continue;
          }

          // TODO(burdon): Check for duplicates.
          const data: Record<string, any> = {
            '@type': schema.typename,
          };

          for (const { id, type } of schema.props) {
            invariant(id);
            const value = obj[id];
            if (value !== undefined && value !== null) {
              switch (type) {
                // TODO(burdon): Currently only handles string properties.
                case Schema.PropType.STRING: {
                  data[id] = new TextObject(value);
                  break;
                }
              }
            }
          }

          const object = new Expando(data, { schema });
          space.db.add(object);
          log.info('created', { json: JSON.stringify(object, null, 2) });
        }
      }
    } catch (err) {
      log.catch(err);
    }
  }
}
