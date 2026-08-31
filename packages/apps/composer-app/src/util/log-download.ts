//
// Copyright 2026 DXOS.org
//

import { type IdbLogStore, MANUAL_LOG_EXPORT_MAX_BYTES } from '@dxos/log-store-idb';
import { downloadBlob } from '@dxos/util';

export { MANUAL_LOG_EXPORT_MAX_BYTES };

export const composerLogFileName = (): string =>
  `composer-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson`;

/**
 * Save an NDJSON blob to disk. Resolves false if the user cancelled the native save dialog.
 */
export const triggerNdjsonDownload = (blob: Blob, fileName = composerLogFileName()): Promise<boolean> =>
  downloadBlob(blob, fileName);

/** Export logs for a user-initiated download, capped at {@link MANUAL_LOG_EXPORT_MAX_BYTES}. */
export const exportManualLogDownload = (logStore: IdbLogStore): Promise<Blob> =>
  logStore.exportBlob({ maxSize: MANUAL_LOG_EXPORT_MAX_BYTES });

/**
 * Export buffered logs from the IDB store and save them to disk.
 * Used by both the in-app download buttons and the `globalThis.downloadLogs`
 * devtools hook.
 */
export const downloadLogs = async (logStore: IdbLogStore): Promise<void> => {
  const blob = await exportManualLogDownload(logStore);
  await triggerNdjsonDownload(blob);
};
