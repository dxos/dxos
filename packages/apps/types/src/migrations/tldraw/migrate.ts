//
// Copyright 2024 DXOS.org
//

import { type SerializedStore } from '@tldraw/store';
import { createTLStore, defaultShapeUtils, loadSnapshot, type TLRecord } from '@tldraw/tldraw';

import { log } from '@dxos/log';

import { CURRENT_VERSION, DEFAULT_VERSION, schema } from './schema';

// TODO(burdon): Update version in package.json.
// TODO(burdon): Try/catch around rendering component component.

/**
 * Attempt to migrated data.
 * https://tldraw.dev/reference/store/Store#migrateSnapshot
 */
export const migrateCanvas = async (
  current: SerializedStore<TLRecord>,
  version = DEFAULT_VERSION,
): Promise<SerializedStore<any>> => {
  log.info('migrating snapshot...', { from: version, to: CURRENT_VERSION });
  try {
    // Try one-shot migration.
    const store = createTLStore({ shapeUtils: defaultShapeUtils });
    const snapshot = store.migrateSnapshot({ schema: schema[version], store: current });

    // Test loading.
    loadSnapshot(store, snapshot);
    return store.serialize();
  } catch (err) {
    log.warn('one-shot migration failed; trying individual records', { err });

    // Try processing records individually.
    const store = createTLStore({ shapeUtils: defaultShapeUtils });
    for (const record of Object.values(current)) {
      try {
        // Migrate individual record.
        const s1 = { [record.id]: record };
        const s2 = store.migrateSnapshot({ schema: schema[version], store: s1 });
        store.put(Object.values(s2.store));
      } catch (err) {
        log.warn('invalid record', { record, err });
      }
    }

    return store.serialize();
  }
};
