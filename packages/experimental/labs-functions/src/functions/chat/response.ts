//
// Copyright 2023 DXOS.org
//

import { type Thread as ThreadType } from '@braneframe/types';
import { type Client } from '@dxos/client';
import { TextObject } from '@dxos/echo-schema';

import { parseMessage } from './parser';

export const createResponse = (client: Client, content: string) => {
  const messages = [];
  const timestamp = new Date().toISOString();

  const result = parseMessage(content, 'json');
  if (result) {
    const { pre, data, post } = result;
    pre && messages.push({ timestamp, text: pre });
    const dataArray = Array.isArray(data) ? data : [data];
    messages.push(
      ...dataArray.map((data): ThreadType.Message => {
        if (typeof data['@type'] === 'string') {
          // TODO(burdon): Experimental?
          console.log(JSON.stringify({ types: client.experimental.types }, undefined, 2));
          const Proto = client.experimental.types.getPrototype(data['@type']);
          const schema = client.experimental.types.getSchema(data['@type']);
          if (Proto && schema) {
            // Pre-processing according to schema.
            delete data['@type'];
            for (const prop of schema.props) {
              if (data[prop.id!]) {
                if (prop.refModelType === 'dxos.org/model/text' && typeof data[prop.id!] === 'string') {
                  data[prop.id!] = new TextObject(data[prop.id!]);
                }
              }
            }

            const ref = new Proto(data);
            return { timestamp, ref };
          }
        }

        // TODO(burdon): Create ref?
        return { timestamp, data: JSON.stringify(data) };
      }),
    );

    post && messages.push({ timestamp, text: post }); // TODO(burdon): Skip TS.
  } else {
    messages.push({
      timestamp,
      text: content,
    });
  }

  return messages;
};
