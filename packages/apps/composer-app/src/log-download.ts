//
// Copyright 2026 DXOS.org
//

import { type IdbLogStore } from '@dxos/log-store-idb';

/**
 * Export buffered logs from the IDB store and trigger a browser download.
 * Used by both the in-app download buttons and the `globalThis.downloadLogs`
 * devtools hook.
 */
export const downloadLogs = async (logStore: IdbLogStore): Promise<void> => {
  const ndjson = await logStore.export();
  const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
  const fileName = `composer-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson`;
  const url = URL.createObjectURL(blob);
  try {
    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', fileName);
    element.setAttribute('target', 'download');
    element.click();
  } finally {
    URL.revokeObjectURL(url);
  }
};
