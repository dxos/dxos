//
// Copyright 2026 DXOS.org
//

import { addons } from 'storybook/preview-api';

import { DOWNLOAD_EVENT, LOGS_DATA_EVENT } from './constants';
import { triggerLogsDownload } from './trigger-download';

/**
 * Requests the current story's buffered logs from `preview.tsx`'s `LogBuffer` and downloads them
 * as NDJSON. Usable from any component rendered inside the preview iframe — e.g. an error-boundary
 * fallback, so a crashed story still offers a one-click way to grab logs without reaching for the
 * manager toolbar's "Download logs" button.
 */
export const downloadLogs = (): void => {
  const channel = addons.getChannel();
  channel.once(LOGS_DATA_EVENT, ({ ndjson }: { ndjson: string }) => {
    triggerLogsDownload(ndjson);
  });
  channel.emit(DOWNLOAD_EVENT);
};
