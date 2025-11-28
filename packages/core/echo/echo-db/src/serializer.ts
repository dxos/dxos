//
// Copyright 2023 DXOS.org
//

import { Filter, type Query } from '@dxos/echo';
import { type EncodedReference, Reference, decodeReference, encodeReference } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { deepMapValues, isNonNullable, stripUndefined } from '@dxos/util';

import { ObjectCore } from './core-db';
import { type AnyLiveObject, getObjectCore } from './echo-handler';
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
    const loadedObjects: Array<AnyLiveObject<any> | undefined> = [];

    if (query) {
      const objects = await database.query(query).run();
      loadedObjects.push(...objects);
    } else {
      const ids = database.coreDatabase.getAllObjectIds();
      for (const chunk of chunkArray(ids, MAX_LOAD_OBJECT_CHUNK_SIZE)) {
        const objects = await database.query(Filter.ids(...chunk)).run({ timeout: 60_000 });
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

  exportObject(object: AnyLiveObject<any>): SerializedObject {
    const core = getObjectCore(object);

    // TODO(dmaretskyi): Unify JSONinfication with echo-handler.
    const typeRef = core.getType();

    const data = serializeEchoData(core.getDecoded(['data']));
    const meta = serializeEchoData(core.getDecoded(['meta']));

    return stripUndefined({
      '@id': core.id,
      '@type': typeRef ? encodeReference(typeRef) : undefined,
      ...data,
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
        return decodeReferenceJSON(value);
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
    core.setType(decodeReferenceJSON(type)!);
    if (deleted) {
      core.setDeleted(deleted);
    }

    database.coreDatabase.addCore(core);
  }
}

const isEncodedReferenceJSON = (value: any): boolean =>
  typeof value === 'object' && value !== null && ('/' in value || value['@type'] === LEGACY_REFERENCE_TYPE_TAG);

export const decodeReferenceJSON = (encoded?: EncodedReference | string): Reference | undefined => {
  if (typeof encoded === 'object' && encoded !== null && '/' in encoded) {
    return decodeReference(encoded);
  } else if (typeof encoded === 'string') {
    // TODO(mykola): Never reached?
    return Reference.fromLegacyTypename(encoded);
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
