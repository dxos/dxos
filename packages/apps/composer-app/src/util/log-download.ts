//
// Copyright 2026 DXOS.org
//

import { type IdbLogStore, MANUAL_LOG_EXPORT_MAX_BYTES } from '@dxos/log-store-idb';

export { MANUAL_LOG_EXPORT_MAX_BYTES };

export const composerLogFileName = (): string =>
  `composer-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson`;

/** Trigger a browser download for an NDJSON blob. */
export const triggerNdjsonDownload = (blob: Blob, fileName = composerLogFileName()): void => {
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

/** Export logs for a user-initiated download, capped at {@link MANUAL_LOG_EXPORT_MAX_BYTES}. */
export const exportManualLogDownload = (logStore: IdbLogStore): Promise<Blob> =>
  logStore.exportBlob({ maxSize: MANUAL_LOG_EXPORT_MAX_BYTES });

/**
 * Export buffered logs from the IDB store and trigger a browser download.
 * Used by both the in-app download buttons and the `globalThis.downloadLogs`
 * devtools hook.
 */
export const downloadLogs = async (logStore: IdbLogStore): Promise<void> => {
  const blob = await exportManualLogDownload(logStore);
  triggerNdjsonDownload(blob);
};
