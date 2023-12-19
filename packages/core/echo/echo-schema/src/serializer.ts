//
// Copyright 2023 DXOS.org
//

import { DocumentModel } from '@dxos/document-model';
import { TYPE_PROPERTIES } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { TextModel } from '@dxos/text-model';
import { stripUndefinedValues } from '@dxos/util';

import { type EchoDatabase } from './database';
import { base, TextObject, TypedObject } from './object';
import { Filter } from './query';

/**
 * Archive of echo objects.
 * 
 * ## Encoding and file format
 * 
 * The data is serialized to JSON.
 * Preferred file extensions are `.dx.json`.
 * The file might be compressed with gzip (`.dx.json.gz`).
 */
export type SerializedSpace = {
  /**
   * Format version number.
   * 
   * Current version: 1.
   */
  version: number;

  /**
   * List of objects included in the archive.
   */
  objects: SerializedObject[];
};

export type SerializedObject = {
  /**
   * Unique object identifier.
   */
  '@id': string;

  /**
   * Fully qualified name for the object's type.
   */
  '@type'?: string;

  /**
   * Flag to indicate soft-deleted objects.
   */
  '@deleted'?: boolean;

  /**
   * @deprecated
   * 
   * Model name for the objects backed by a legacy ECHO model.
   */
  '@model'?: string;

  /**
   * @deprecated
   * 
   * Text content of Text object.
   */
  '@text'?: {
    text: string;
    kind?: TextKind;
    field?: string;
  };
} & Record<string, any>;

// TODO(burdon): Schema not present when reloaded from persistent store.
// TODO(burdon): Option to decode JSON/protobuf.
// TODO(burdon): Sort JSON keys (npm canonical serialize util).
export class Serializer {
  static version = 1;

  async export(database: EchoDatabase): Promise<SerializedSpace> {
    const { objects } = database.query(undefined, { models: ['*'] });
    const data = {
      objects: objects.map((object) => {
        return stripUndefinedValues({
          ...object[base].toJSON(), // TODO(burdon): Not working unless schema.
        });
      }),

      version: Serializer.version,
    };

    return data;
  }

  async import(database: EchoDatabase, data: SerializedSpace) {
    invariant(data.version === Serializer.version, `Invalid version: ${data.version}`);
    const {
      objects: [properties],
    } = database.query(Filter.typename(TYPE_PROPERTIES));

    const { objects } = data;

    for (const object of objects) {
      const {
        '@id': id,
        '@type': type,
        '@model': model,
        '@deleted': deleted,
        '@meta': meta,
        '@text': text,
        ...data
      } = object;

      // Handle Space Properties
      // TODO(mykola): move to @dxos/client
      if (properties && type === TYPE_PROPERTIES) {
        Object.entries(data).forEach(([name, value]) => {
          if (!name.startsWith('@')) {
            properties[name] = value;
          }
        });
        continue;
      }

      switch (model) {
        case TextModel.meta.type: {
          invariant(text);
          const obj = new TextObject(text.text, text.kind, text.field);
          obj[base]._id = id;
          database.add(obj);
          if (deleted) {
            // Note: We support "soft" deletion. This is why adding and removing the object is not equal to no-op.
            database.remove(obj);
          }
          await database.flush();
          break;
        }

        case DocumentModel.meta.type:
        default: {
          invariant(!text);
          const Prototype = (type ? database.graph.types.getPrototype(type) : undefined) ?? TypedObject;

          const obj = new Prototype(
            {
              ...data,
            },
            { meta },
          );
          obj[base]._id = id;
          database.add(obj);
          if (deleted) {
            // Note: We support "soft" deletion. This is why adding and removing the object is not equal to no-op.
            database.remove(obj);
          }
          await database.flush();
          break;
        }
      }
    }
  }
}
