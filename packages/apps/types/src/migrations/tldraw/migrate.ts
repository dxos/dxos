//
// Copyright 2024 DXOS.org
//

import { createTLStore, defaultShapeUtils, loadSnapshot } from '@tldraw/tldraw';

import { log } from '@dxos/log';

import { schema, CURRENT_VERSION, DEFAULT_VERSION } from './schema';

export const migrateCanvas = (records: any, version = DEFAULT_VERSION) => {
  const store = createTLStore({ shapeUtils: defaultShapeUtils });
  const snapshot = store.migrateSnapshot({ schema: schema[version], store: records });
  try {
    log.info('loading', { records: Object.keys(snapshot.store).length, schema: snapshot.schema.schemaVersion });
    loadSnapshot(store, snapshot);
    log.info('migrated schema', { version: CURRENT_VERSION });
    const migratedRecords = store.allRecords();
    return migratedRecords;
  } catch (err) {
    log.error('failed to migrate tldraw schema', { from: version, to: CURRENT_VERSION, error: err });
    return records;
  }
};
