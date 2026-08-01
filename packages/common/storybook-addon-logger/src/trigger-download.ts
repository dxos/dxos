//
// Copyright 2026 DXOS.org
//

/**
 * Downloads NDJSON log data as a file. Shared by the manager toolbar button (`manager.tsx`) and
 * the preview-side `downloadLogs` (`download.ts`), which run in different Storybook contexts but
 * both end up with the same buffered NDJSON string to save.
 */
export const triggerLogsDownload = (ndjson: string): void => {
  const blob = new Blob([ndjson], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `storybook-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.ndjson`;
  anchor.click();
  URL.revokeObjectURL(url);
};
