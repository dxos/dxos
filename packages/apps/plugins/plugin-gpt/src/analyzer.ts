//
// Copyright 2024 DXOS.org
//

import OpenAI from 'openai';
import { type Chat } from 'openai/resources';

import { type Document as DocumentType } from '@braneframe/types';
import { type Space } from '@dxos/client/echo';
import { getTextContent, toJsonSchema, Schema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

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
    console.info('analyzing...', { length: text?.length, schema: schemas.length });
    if (!text?.length || !schemas.length) {
      return;
    }

    const messages: Chat.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: [
          //
          'You are a machine that only replies with valid, iterable RFC8259 compliant JSON in your responses.',
          'Your entire response should be a single array of JSON objects.',
          'Each object should conform to the following schemas:',
          '---',
          schemas.map((schema) => toJsonSchema(schema)).join('\n'),
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

    const stream = await this._client.chat.completions.create({ model: 'gpt-4', messages, stream: true });
    for await (const chunk of stream) {
      console.log(chunk.choices[0]?.delta?.content || '');
    }
  }
}
