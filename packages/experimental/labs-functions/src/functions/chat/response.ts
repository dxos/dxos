//
// Copyright 2023 DXOS.org
//

import { type Message as MessageType, Document as DocumentType, Stack as StackType } from '@braneframe/types';
import { Expando, type Space } from '@dxos/client/echo';
import { Schema, TextObject } from '@dxos/echo-schema';
import { log } from '@dxos/log';

import { type PromptContext } from './context';
import { parseMessage, type ParseResult } from './parser';

// TODO(burdon): Create variant of StringOutputParser.
//  https://js.langchain.com/docs/modules/model_io/output_parsers/json_functions
export const createResponse = (space: Space, context: PromptContext, text: string): MessageType.Block[] | undefined => {
  const blocks: MessageType.Block[] = [];

  const result = parseMessage(text);
  const { timestamp, pre, post } = result;

  if (pre) {
    blocks.push({ timestamp, text: pre });
  }

  blocks.push(...processResult(space, context, result));

  if (post) {
    blocks.push({ timestamp, text: post });
  }

  return blocks;
};

const processResult = (space: Space, context: PromptContext, result: ParseResult): MessageType.Block[] => {
  const timestamp = new Date().toISOString();
  const { data, content, type, kind } = result;
  log.info('parse', { result });

  //
  // Add to stack.
  //
  if (context.object?.__typename === StackType.schema.typename) {
    // TODO(burdon): Insert based on prompt config.
    log.info('adding section to stack', { stack: context.object.id });

    const formatFenced = (type: string, content: string) => {
      const tick = '```';
      return `${tick}${type}\n${content}\n${tick}\n`;
    };

    const formattedContent =
      type !== 'markdown' && kind === 'fenced'
        ? '# Generated content\n\n' + formatFenced(type, content.trim())
        : content;

    context.object.sections.push(
      new StackType.Section({
        object: new DocumentType({ content: new TextObject(formattedContent) }),
      }),
    );

    return [];
  }

  //
  // Convert JSON data to objects.
  //
  if (result.type === 'json') {
    const dataArray = Array.isArray(data) ? data : [data];
    return dataArray.map((data): MessageType.Block => {
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
    });
  }

  //
  // Default
  //
  return [
    {
      timestamp,
      text: content,
    },
  ];
};
