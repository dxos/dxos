//
// Copyright 2023 DXOS.org
//

import { Reference, TYPE_PROPERTIES } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { type ItemID } from '@dxos/protocols';
import { stripUndefinedValues } from '@dxos/util';

import { getAutomergeObjectCore } from './automerge';
import { type EchoDatabase } from './database';
import { TypedObject, base, type EchoObject } from './object';
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
   * Human-readable date of creation.
   */
  timestamp?: string;

  /**
   * Space key.
   */
  // TODO(mykola): Maybe remove this?
  spaceKey?: string;

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
   * Format version number.
   *
   * Current version: 1.
   */
  '@version': number;

  /**
   * Human-readable date of creation.
   */
  '@timestamp'?: string;

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
        return this.exportObject(object as any);
      }),

      version: Serializer.version,
      timestamp: new Date().toUTCString(),
      spaceKey: database.spaceKey.toHex(),
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

      await this.importObject(database, object);
    }
  }

  exportObject(object: TypedObject): SerializedObject {
    return stripUndefinedValues({
      ...(object[base] ? object[base].toJSON() : object.toJSON()), // TODO(burdon): Not working unless schema.
      '@version': Serializer.version,
      '@timestamp': new Date().toUTCString(),
    });
  }

  async importObject(database: EchoDatabase, object: SerializedObject) {
    const { '@id': id, '@type': type, '@deleted': deleted, '@meta': meta, ...data } = object;

    const obj = new TypedObject(Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('@'))), {
      meta,
      type: getTypeRef(type),
    });

    setObjectId(obj, id);
    database.add(obj);
    if (deleted) {
      // Note: We support "soft" deletion. This is why adding and removing the object is not equal to no-op.
      database.remove(obj);
    }
    await database.flush();
    return obj;
  }
}

export const getTypeRef = (type?: SerializedReference | string): Reference | undefined => {
  if (typeof type === 'object' && type !== null) {
    return new Reference(type.itemId, type.protocol, type.host);
  } else if (typeof type === 'string') {
    // TODO(mykola): Never reached?
    return Reference.fromLegacyTypename(type);
  }
};

/**
 * Works with both automerge and legacy objects.
 */
const setObjectId = (obj: EchoObject, id: string) => {
  const core = getAutomergeObjectCore(obj);
  invariant(core);
  core.id = id;
};
