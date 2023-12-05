//
// Copyright 2023 DXOS.org
//

import { type Message as MessageType } from '@braneframe/types';
import { Expando, type Space } from '@dxos/client/echo';
import { Schema, TextObject } from '@dxos/echo-schema';

import { parseMessage } from './parser';
import { type PromptContext } from './request';

// TODO(burdon): Create variant of StringOutputParser.
//  https://js.langchain.com/docs/modules/model_io/output_parsers/json_functions
export const createResponse = (space: Space, context: PromptContext, content: string): MessageType.Block[] => {
  const timestamp = new Date().toISOString();

  const blocks: MessageType.Block[] = [];
  const result = parseMessage(content, 'json');
  if (result) {
    const { pre, data, post } = result;
    pre && blocks.push({ timestamp, text: pre });
    const dataArray = Array.isArray(data) ? data : [data];

    blocks.push(
      ...dataArray.map((data): MessageType.Block => {
        // TODO(burdon): Validate that the schema was used.
        if (context.schema) {
          data['@type'] = context.schema.typename;
        }

        const { objects: schemas } = space.db.query(Schema.filter());
        const schema = schemas.find((schema) => schema.typename === data['@type']);
        if (schema) {
          for (const prop of schema.props) {
            if (data[prop.id!]) {
              if (/* prop.refModelType === 'dxos.org/model/text' && */ typeof data[prop.id!] === 'string') {
                data[prop.id!] = new TextObject(data[prop.id!]);
              }
            }
          }

          const object = new Expando(data, { schema });
          return { timestamp, object };
        }

        // TODO(burdon): Create ref?
        return { timestamp, data: JSON.stringify(data) };
      }),
    );

    post && blocks.push({ timestamp, text: post });
  } else {
    blocks.push({
      timestamp,
      text: content,
    });
  }

  return blocks;
};
