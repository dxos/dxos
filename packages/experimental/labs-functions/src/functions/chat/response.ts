//
// Copyright 2023 DXOS.org
//

import { type Message as MessageType } from '@braneframe/types';
import { type Client } from '@dxos/client';
import { Expando, type Space } from '@dxos/client/echo';
import { Schema, TextObject } from '@dxos/echo-schema';

import { parseMessage } from './parser';

export const createResponse = (client: Client, space: Space, content: string): MessageType.Block[] => {
  const timestamp = new Date().toISOString();

  const blocks: MessageType.Block[] = [];
  const result = parseMessage(content, 'json');
  if (result) {
    const { pre, data, post } = result;
    pre && blocks.push({ timestamp, text: pre });
    const dataArray = Array.isArray(data) ? data : [data];

    // TODO(burdon): Create test.
    // TODO(burdon): What format does the Thread messenger require?
    // console.log('response', { dataArray });

    blocks.push(
      ...dataArray.map((data): MessageType.Block => {
        // TODO(burdon): Hack in the schema.
        data['@type'] = 'example.com/schema/project';
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

        // if (typeof data['@type'] === 'string') {
        //   // TODO(burdon): Experimental?
        //   const Type = client.experimental.types.getPrototype(data['@type']);
        //   const schema = client.experimental.types.getSchema(data['@type']);
        //
        //   if (Type && schema) {
        //     // Pre-processing according to schema.
        //     delete data['@type'];
        //     for (const prop of schema.props) {
        //       if (data[prop.id!]) {
        //         if (prop.refModelType === 'dxos.org/model/text' && typeof data[prop.id!] === 'string') {
        //           data[prop.id!] = new TextObject(data[prop.id!]);
        //         }
        //       }
        //     }
        //
        //     const object = new Expando(data, {});
        //     return { timestamp, object };
        //   }
        // }

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
