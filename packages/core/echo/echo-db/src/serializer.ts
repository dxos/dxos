//
// Copyright 2023 DXOS.org
//

import { Filter, type Obj, type Query } from '@dxos/echo';
import { EncodedReference as EncodedRef, type EncodedReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { deepMapValues, isNonNullable, stripUndefined } from '@dxos/util';

import { ObjectCore } from './core-db';
import { getObjectCore } from './echo-handler';
import { type EchoDatabase } from './proxy-db';
import type { SerializedObject, SerializedSpace } from './serialized-space';

const MAX_LOAD_OBJECT_CHUNK_SIZE = 30;

const LEGACY_REFERENCE_TYPE_TAG = 'dxos.echo.model.document.Reference';

export type ImportOptions = {
  /**
   * Called for each object before importing.
   * @returns true to import the object, false to skip.
   */
  onObject?: (object: SerializedObject) => Promise<boolean>;
};

// TODO(burdon): Schema not present when reloaded from persistent store.
// TODO(burdon): Option to decode JSON/protobuf.
// TODO(burdon): Sort JSON keys (npm canonical serialize util).
export class Serializer {
  static version = 1;

  async export(database: EchoDatabase, query?: Query.Any): Promise<SerializedSpace> {
    const loadedObjects: Array<Obj.Any | undefined> = [];

    if (query) {
      const objects = await database.query(query).run();
      loadedObjects.push(...objects);
    } else {
      const ids = database.coreDatabase.getAllObjectIds();
      for (const chunk of chunkArray(ids, MAX_LOAD_OBJECT_CHUNK_SIZE)) {
        const objects = await database.query(Filter.id(...chunk)).run({ timeout: 60_000 });
        loadedObjects.push(...objects);
      }
    }

    const data = {
      version: Serializer.version,
      timestamp: new Date().toISOString(),
      objects: loadedObjects.filter(isNonNullable).map((object) => {
        return this.exportObject(object as any);
      }),
    };

    return data;
  }

  async import(database: EchoDatabase, data: SerializedSpace, opts?: ImportOptions): Promise<void> {
    invariant(data.version === Serializer.version, `Invalid version: ${data.version}`);

    const { objects } = data;
    for (const object of objects) {
      const shouldImport = opts?.onObject ? await opts.onObject(object) : true;

      if (shouldImport) {
        this._importObject(database, object);
      }
    }
    await database.flush();
  }

  exportObject(object: Obj.Any): SerializedObject {
    const core = getObjectCore(object);

    // TODO(dmaretskyi): Unify JSONinfication with echo-handler.
    const typeRef = core.getType();

    // Note: EncodedReference values are already JSON-serializable ({ '/': string }).
    const data = core.getDecoded(['data']);
    const meta = core.getDecoded(['meta']);

    return stripUndefined({
      '@id': core.id,
      '@type': typeRef,
      ...(data as object),
      '@version': Serializer.version,
      '@meta': meta,
      '@timestamp': new Date().toISOString(),
    });
  }

  private _importObject(database: EchoDatabase, object: SerializedObject): void {
    const { '@id': id, '@type': type, '@deleted': deleted, '@meta': meta, ...data } = object;
    const dataProperties = Object.fromEntries(Object.entries(data).filter(([key]) => !key.startsWith('@')));
    const decodedData = deepMapValues(dataProperties, (value, recurse) => {
      if (isEncodedReferenceJSON(value)) {
        return decodeEncodedReferenceFromJSON(value);
      } else {
        return recurse(value);
      }
    });

    const core = new ObjectCore();
    core.id = id;
    // TODO(dmaretskyi): Can't pass type in opts.
    core.initNewObject(decodedData, {
      meta,
    });
    const typeDXN = decodeDXNFromJSON(type);
    if (typeDXN) {
      core.setType(EncodedRef.fromDXN(typeDXN));
    }
    if (deleted) {
      core.setDeleted(deleted);
    }

    database.coreDatabase.addCore(core);
  }
}

const isEncodedReferenceJSON = (value: any): boolean =>
  typeof value === 'object' && value !== null && ('/' in value || value['@type'] === LEGACY_REFERENCE_TYPE_TAG);

export const decodeDXNFromJSON = (encoded?: EncodedReference | string): DXN | undefined => {
  if (typeof encoded === 'object' && encoded !== null && '/' in encoded) {
    return EncodedRef.toDXN(encoded);
  } else if (typeof encoded === 'string') {
    // TODO(mykola): Never reached?
    return DXN.fromTypename(encoded);
  }
};

/**
 * Decode an encoded reference from JSON format to EncodedReference.
 * Handles both the current `{ '/': string }` format and the legacy `{ '@type': ..., objectId, ... }` format.
 */
const decodeEncodedReferenceFromJSON = (value: any): EncodedReference | undefined => {
  if (typeof value === 'object' && value !== null && '/' in value) {
    // Already in the correct format.
    return value as EncodedReference;
  } else if (typeof value === 'object' && value !== null && value['@type'] === LEGACY_REFERENCE_TYPE_TAG) {
    // Legacy format: convert to DXN and then to EncodedReference.
    const dxn = DXN.fromTypename(value.objectId);
    return EncodedRef.fromDXN(dxn);
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
