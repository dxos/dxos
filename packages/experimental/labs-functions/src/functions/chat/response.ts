//
// Copyright 2023 DXOS.org
//

import { type Message as MessageType, Document as DocumentType, Stack as StackType } from '@braneframe/types';
import { Expando, type Space } from '@dxos/client/echo';
import { Schema, TextObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { parseMessage } from './parser';
import { type PromptContext } from './request';

// TODO(burdon): Create test.

// TODO(burdon): Create variant of StringOutputParser.
//  https://js.langchain.com/docs/modules/model_io/output_parsers/json_functions
export const createResponse = (space: Space, context: PromptContext, content: string): MessageType.Block[] => {
  const timestamp = new Date().toISOString();
  
  const blocks: MessageType.Block[] = [];
  const result = parseMessage(content);
  log.info('parse', { result, content });
  if (result) {
    const { pre, data, content, post, type } = result;
    pre && blocks.push({ timestamp, text: pre });

    switch (result.type) {
      case 'json': {
        const dataArray = Array.isArray(data) ? data : [data];
        blocks.push(
          ...dataArray.map((data): MessageType.Block => {
            // Create object.
            if (context.schema) {
              const { objects: schemas } = space.db.query(Schema.filter());
              const schema = schemas.find((schema) => schema.typename === context.schema!.typename);
              if (schema) {
                data['@type'] = context.schema.typename;
                for (const prop of schema.props) {
                  if (data[prop.id!]) {
                    if (typeof data[prop.id!] === 'string') {
                      data[prop.id!] = new TextObject(data[prop.id!]);
                    }
                  }
                }

                const object = new Expando(data, { schema });
                return { timestamp, object };
              }
            }

            // TODO(burdon): Create ref?
            return { timestamp, data: JSON.stringify(data) };
          }),
        );
        break;
      }

      case 'mermaid': {
        // TODO(burdon): Insert based on prompt config.
        if (context.object?.__typename === StackType.schema.typename) {
          log.info('adding mermaid diagram to stack', { stack: context.object.id });
          context.object.sections.push(
            new StackType.Section({
              object: new DocumentType({ content: new TextObject(`\`\`\`${type}\n${content.trim()}\n\`\`\`\n`) }),
            }),
          );
        }
        break;
      }
    }

    post && blocks.push({ timestamp, text: post });
  } else {
    blocks.push({
      timestamp,
      text: content,
    });
  }

  return blocks;
};
