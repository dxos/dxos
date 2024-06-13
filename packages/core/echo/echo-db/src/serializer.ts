//
// Copyright 2023 DXOS.org
//

import { type EncodedReferenceObject, encodeReference, Reference } from '@dxos/echo-protocol';
import { TYPE_PROPERTIES } from '@dxos/echo-schema';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { deepMapValues, nonNullable, stripUndefinedValues } from '@dxos/util';

import { ObjectCore, getObjectCore } from './core-db';
import { type EchoDatabase } from './proxy-db';
import { Filter } from './query';
import type { SerializedObjectData, SerializedSpaceData } from './serialized-space';

const MAX_LOAD_OBJECT_CHUNK_SIZE = 30;

// TODO(burdon): Schema not present when reloaded from persistent store.
// TODO(burdon): Option to decode JSON/protobuf.
// TODO(burdon): Sort JSON keys (npm canonical serialize util).
export class Serializer {
  static version = 1;

  async export(database: EchoDatabase): Promise<SerializedSpaceData> {
    const ids = database.coreDatabase.getAllObjectIds();

    const loadedObjects: Array<EchoReactiveObject<any> | undefined> = [];
    for (const chunk of chunkArray(ids, MAX_LOAD_OBJECT_CHUNK_SIZE)) {
      loadedObjects.push(...(await database.batchLoadObjects(chunk)));
    }

    const data = {
      objects: loadedObjects.filter(nonNullable).map((object) => {
        return this._exportObject(object as any);
      }),

      version: Serializer.version,
      timestamp: new Date().toUTCString(),
      spaceKey: database.spaceKey.toHex(),
    };

    return data;
  }

  async import(database: EchoDatabase, data: SerializedSpaceData) {
    invariant(data.version === Serializer.version, `Invalid version: ${data.version}`);
    const {
      objects: [properties],
    } = await database.query(Filter.typename(TYPE_PROPERTIES)).run();

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

      this._importObject(database, object);
    }
    await database.flush();
  }

  private _exportObject(object: EchoReactiveObject<any>): SerializedObjectData {
    const core = getObjectCore(object);

    // TODO(dmaretskyi): Unify JSONinfication with echo-handler.
    const typeRef = core.getType();

    const data = serializeEchoData(core.getDecoded(['data']));
    const meta = serializeEchoData(core.getDecoded(['meta']));

    return stripUndefinedValues({
      '@id': core.id,
      '@type': typeRef ? encodeReference(typeRef) : undefined,
      ...data,
      '@version': Serializer.version,
      '@meta': meta,
      '@timestamp': new Date().toUTCString(),
    });
  }

  private _importObject(database: EchoDatabase, object: SerializedObjectData) {
    const { '@id': id, '@type': type, '@deleted': deleted, '@meta': meta, ...data } = object;
    const dataProperties = Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('@')));

    const core = new ObjectCore();
    core.id = id;
    // TODO(dmaretskyi): Can't pass type in opts.
    core.initNewObject(dataProperties, {
      meta,
    });
    core.setType(getTypeRef(type)!);
    if (deleted) {
      core.setDeleted(deleted);
    }

    database.coreDatabase.addCore(core);
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

const chunkArray = <T>(arr: T[], chunkSize: number): T[][] => {
  if (arr.length === 0 || chunkSize < 1) {
    return [];
  }
  let index = 0;
  let resIndex = 0;
  const result = new Array(Math.ceil(arr.length / chunkSize));
  while (index < arr.length) {
    result[resIndex++] = arr.slice(index, (index += chunkSize));
  }
  return result;
};

const serializeEchoData = (data: any): any =>
  deepMapValues(data, (value, recurse) => {
    if (value instanceof Reference) {
      return encodeReference(value);
    }
    return recurse(value);
  });
