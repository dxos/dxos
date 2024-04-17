//
// Copyright 2023 DXOS.org
//

import { Reference, TYPE_PROPERTIES } from '@dxos/echo-db';
import { type EncodedReferenceObject, encodeReference } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { stripUndefinedValues } from '@dxos/util';

import { AutomergeObjectCore, getAutomergeObjectCore } from './automerge';
import { type EchoDatabase } from './database';
import { type EchoReactiveObject } from './effect/reactive';
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
  '@type'?: EncodedReferenceObject | string;

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
    const ids = database.automerge.getAllObjectIds();
    const objects = await Promise.all(ids.map(async (id) => database.automerge.loadObjectById(id)));

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

  exportObject(object: EchoReactiveObject<any>): SerializedObject {
    const core = getAutomergeObjectCore(object);

    // TODO(dmaretskyi): Unify JSONinfication with echo-handler.
    const typeRef = core.getType();

    const data = core.getDecoded(['data']) as Record<string, any>;
    const meta = core.getDecoded(['meta']) as Record<string, any>;

    return stripUndefinedValues({
      '@id': core.id,
      '@type': typeRef ? encodeReference(typeRef) : undefined,
      ...data,
      '@version': Serializer.version,
      '@meta': meta,
      '@timestamp': new Date().toUTCString(),
    });
  }

  async importObject(database: EchoDatabase, object: SerializedObject) {
    const { '@id': id, '@type': type, '@deleted': deleted, '@meta': meta, ...data } = object;
    const dataProperties = Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('@')));

    const core = new AutomergeObjectCore();
    core.id = id;
    // TODO(dmaretskyi): Can't pass type in opts.
    core.initNewObject(dataProperties, {
      meta,
    });
    core.setType(getTypeRef(type)!);
    if (deleted) {
      core.setDeleted(deleted);
    }

    database.automerge.addCore(core);
    await database.flush();
  }
}

export const getTypeRef = (type?: EncodedReferenceObject | string): Reference | undefined => {
  if (typeof type === 'object' && type !== null) {
    return new Reference(type.itemId!, type.protocol!, type.host!);
  } else if (typeof type === 'string') {
    // TODO(mykola): Never reached?
    return Reference.fromLegacyTypename(type);
  }
};
