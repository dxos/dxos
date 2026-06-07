//
// Copyright 2026 DXOS.org
//

import { IdbLogStore } from '@dxos/log-store-idb';

import { LOG_STORE_DB_NAME } from '../constants';
import { downloadLogs } from '../log-download';

/** Export NDJSON logs from the IDB log collector and trigger a browser download. */
export const downloadRecoveryLogs = async (): Promise<{ byteLength: number }> => {
  const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME });
  const ndjson = await logStore.export();
  const byteLength = new TextEncoder().encode(ndjson).byteLength;
  await downloadLogs(logStore);
  return { byteLength };
};
