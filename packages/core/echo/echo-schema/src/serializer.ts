//
// Copyright 2023 DXOS.org
//

import { DocumentModel } from '@dxos/document-model';
import { TextModel } from '@dxos/text-model';

import { EchoDatabase } from './database';
import { base } from './defs';
import { Document } from './document';
import { Text } from './text-object';
import { strip } from './util';

export type SerializedObject = {
  '@id': string;
  '@type'?: string;
  '@model'?: string;
  /**
   * Text content of Text object.
   */
  text: string;
};

export type SerializedSpace = {
  objects: SerializedObject[];
};

// TODO(burdon): Schema not present when reloaded from persistent store.
// TODO(burdon): Option to decode JSON/protobuf.
// TODO(burdon): Sort JSON keys (npm canonical serialize util).
export class Serializer {
  async export(database: EchoDatabase): Promise<SerializedSpace> {
    const { objects } = database.query();
    const data = {
      objects: objects.map((object) => {
        return strip({
          ...object[base].toJSON() // TODO(burdon): Not working unless schema.
        });
      })
    };

    return data;
  }

  async import(database: EchoDatabase, data: SerializedSpace) {
    const {
      objects: [properties]
    } = database.query({ '@type': 'dxos.sdk.client.Properties' });
    const { objects } = data;
    for (const object of objects) {
      const { '@id': id, '@type': type, '@model': model, ...data } = object;

      // Handle Space Properties
      // TODO(mykola): move to @dxos/client
      if (properties && type === 'dxos.sdk.client.Properties') {
        Object.entries(data).forEach(([name, value]) => {
          if (!name.startsWith('@')) {
            properties[name] = value;
          }
        });
        continue;
      }

      switch (model) {
        case DocumentModel.meta.type: {
          const Prototype = (type ? database.router.schema?.getPrototype(type) : undefined) ?? Document;
          const echoSchema = type ? database.router.schema?.getType(type) : undefined;

          const obj = new Prototype(
            {
              ...data
            },
            echoSchema
          );
          obj[base]._id = id;
          await database.add(obj);
          break;
        }
        case TextModel.meta.type: {
          const obj = new Text(data.text);
          obj[base]._id = id;
          await database.add(obj);
          break;
        }
      }
    }
  }
}
