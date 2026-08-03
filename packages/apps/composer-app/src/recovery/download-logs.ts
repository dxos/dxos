//
// Copyright 2026 DXOS.org
//

import { IdbLogStore } from '@dxos/log-store-idb';

import { LOG_STORE_DB_NAME, LOG_STORE_MAX_BYTES, exportManualLogDownload, triggerNdjsonDownload } from '../util';

/** Export NDJSON logs from the IDB log collector and trigger a browser download. */
export const downloadRecoveryLogs = async (): Promise<{ byteLength: number }> => {
  const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME, maxBytes: LOG_STORE_MAX_BYTES });
  try {
    const blob = await exportManualLogDownload(logStore);
    triggerNdjsonDownload(blob);
    return { byteLength: blob.size };
  } finally {
    await logStore.close();
  }
};
