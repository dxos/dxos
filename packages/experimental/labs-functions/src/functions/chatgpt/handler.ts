//
// Copyright 2023 DXOS.org
//

import { Thread } from '@braneframe/types';
import { sleep } from '@dxos/async';
import { type FunctionContext } from '@dxos/functions';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { ChatModel } from './chat-model';
import { parseMessage } from './parser';
import { getKey } from '../../util';
import { ChatCompletionRequestMessage } from 'openai';
import { Schema, Text } from '@dxos/echo-schema';

type HandlerProps = {
  space: string;
  objects: string[];
};

// TODO(burdon): Feedback (presence).
// TODO(burdon): Prevent multiple responses (esp. if slow).

const identityKey = PublicKey.random().toHex(); // TODO(burdon): ???

export default async (event: HandlerProps, context: FunctionContext) => {
  const { space: spaceKey, objects: blockIds } = event; // TODO(burdon): Rename objects.
  const config = context.client.config;
  const space = context.client.spaces.get(PublicKey.from(spaceKey))!;

  // TODO(burdon): Logging (filename missing).
  log.info('chatgpt', { space: space.key });

  // Get active threads.
  // TODO(burdon): Handle batches with multiple block mutations per thread?
  const query = space.db.query(Thread.filter());
  const threads: Thread[] = query.objects; // TODO(burdon): Infer type?
  const activeThreads = blockIds.reduce((set, blockId) => {
    const thread = threads.find((thread) => thread.blocks.some((block) => block.id === blockId));
    if (thread) {
      set.add(thread);
    }
    return set;
  }, new Set<Thread>());

  // Process threads.
  await Promise.all(
    Array.from(activeThreads).map(async (thread) => {
      // Wait for block to be added.
      await sleep(500);
      // TODO(burdon): Create set of messages.
      const block = thread.blocks[thread.blocks.length - 1];

      if (block.__meta.keys.length === 0) {
        const model = new ChatModel({
          // TODO(burdon): Normalize env.
          orgId: process.env.COM_OPENAI_ORG_ID ?? getKey(config, 'openai.com/org_id')!,
          apiKey: process.env.COM_OPENAI_API_KEY ?? getKey(config, 'openai.com/api_key')!,
        });

        log.info('block', {
          thread: thread?.id.slice(0, 8),
          block: block.id.slice(0, 8),
          messages: block.messages.length,
          meta: block.__meta, // TODO(burdon): Use to distinguish generated messages.
        });

        const schemas = SCHEMA_CONFIG.map(config => ({ config, schema: context.client.experimental.types.getSchema(config.typename) }))

        // Kill switch.
        const ENABLE_SCHEMA: true = true;

        // TODO(burdon): Pass in history.
        // TODO(burdon): Error handling (e.g., 401);
        const chatContents: ChatCompletionRequestMessage[] = [
          ENABLE_SCHEMA && { role: 'system', content: `
          In your replies you can choose to output data in a structured format.
          Structured data is formatted as an array of JSON objects conforming to the schema.
          Include "@type" field with the exact name of one of the provided schema types.
          In structured mode do not include any other text in your replies, just a single JSON block.
          Include real data in your replies, not just the schema.

          Example:

          [
           {
             "@type": "project.Example.Type",
             "title": "hypercore",
             "content": "hypercore is a protocol and network for distributing and replicating static feeds"
           }
          ]

          Available schema types:

          ${schemas.map(({ config, schema }) =>schema ? formatSchema(schema, config) : '').join('\n')}
          `
          },
          ...block.messages.map((message): ChatCompletionRequestMessage => ({ role: 'user', content: message.text ?? '' })),
        ] 

        log.info('request', { chatContents })

        const { content } =
          (await model.request(chatContents)) ?? {};

        log.info('response', { content });

        if (content) {
          const timestamp = new Date().toISOString();
          const messages = [];

          const result = parseMessage(content, 'json');
          if (result) {
            const { pre, data, post } = result;
            pre && messages.push({ timestamp, text: pre });
            
            const datas = Array.isArray(data) ? data : [data];
            
            messages.push(...datas.map((data): Thread.Message => {
              if(typeof data['@type'] === 'string') {
                const Proto = context.client.experimental.types.getPrototype(data['@type'])
                const schema = context.client.experimental.types.getSchema(data['@type'])

                
                if(Proto && schema) {
                  // Pre-processing according to schema
                  delete data['@type'];
                  for(const prop of schema.props) {
                    if(data[prop.id!]) {
                      if(prop.refModelType === 'dxos.org/model/text' && typeof data[prop.id!] === 'string') {
                        data[prop.id!] = new Text(data[prop.id!])
                      }
                    }
                  }
                  
                  const ref = new Proto(data);

                  return { timestamp, ref: ref }
                }
              }
              
              return { timestamp, data: JSON.stringify(data) }
              
            }));

            post && messages.push({ timestamp, text: post }); // TODO(burdon): Skip TS.
          } else {
            messages.push({
              timestamp,
              text: content,
            });
          }

          thread.blocks.push(
            new Thread.Block(
              {
                identityKey,
                messages,
              },
              {
                meta: {
                  keys: [{ source: 'openai.com' }],
                },
              },
            ),
          );
        }
      }
    }),
  );

  return context.status(200).succeed();
};

type SchemaConfig = {
  typename: string
  allowedFields: string[]
}

const SCHEMA_CONFIG: SchemaConfig[] = [
  {
    typename: 'braneframe.Grid.Item',
    allowedFields: [
      'title',
      'content',
      'color'
    ]
  },
]


const formatSchema = (schema: Schema, config?: SchemaConfig) => {
  const props = !config || config.allowedFields.length === 0 ? schema.props : schema.props.filter(prop => config?.allowedFields.includes(prop.id!))

  return `
    @type: ${schema.typename}
    fields:
      ${props.map(prop => `${prop.id}: ${prop.type}`).join('\n      ')}
    \n
  `
}