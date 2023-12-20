//
// Copyright 2023 DXOS.org
//

import { Reference } from '@dxos/document-model';
import { TYPE_PROPERTIES } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { type ItemID } from '@dxos/protocols';
import { TextModel } from '@dxos/text-model';
import { stripUndefinedValues } from '@dxos/util';

import { type EchoDatabase } from './database';
import { base, type EchoObject, LEGACY_TEXT_TYPE, TextObject, TypedObject } from './object';
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

export type SerializedReference = {
  '@type': 'dxos.echo.model.document.Reference';
  itemId: ItemID;
  protocol: string;
  host: string;
};

export type SerializedObject = {
  /**
   * Unique object identifier.
   */
  '@id': string;

  /**
   * Reference to a type.
   */
  '@type'?: SerializedReference | string;

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
      const { '@type': type, ...data } = object;

      // Handle Space Properties
      if (
        properties &&
        (type === TYPE_PROPERTIES || (typeof type === 'object' && type !== null && type.itemId === TYPE_PROPERTIES))
      ) {
        Object.entries(data).forEach(([name, value]) => {
          if (!name.startsWith('@')) {
            properties[name] = value;
          }
        });
        continue;
      }

      await this._importObject(database, object);
    }
  }

  private async _importObject(database: EchoDatabase, object: SerializedObject) {
    const { '@id': id, '@type': type, '@model': model, '@deleted': deleted, '@meta': meta, ...data } = object;

    let obj: EchoObject;
    if (model === TextModel.meta.type || type === LEGACY_TEXT_TYPE) {
      invariant(data.field);
      obj = new TextObject(data[data.field], data.kind, data.field);
    } else {
      let typeRef: Reference | undefined;
      if (typeof type === 'object' && type !== null) {
        typeRef = new Reference(type.itemId, type.protocol, type.host);
      } else if (typeof type === 'string') {
        // TODO(mykola): Never reached?
        typeRef = Reference.fromLegacyTypename(type);
      }

      obj = new TypedObject(
        {
          ...data,
        },
        { meta, type: typeRef },
      );
    }

    obj[base]._id = id;
    database.add(obj);
    if (deleted) {
      // Note: We support "soft" deletion. This is why adding and removing the object is not equal to no-op.
      database.remove(obj);
    }
    await database.flush();
  }
}
