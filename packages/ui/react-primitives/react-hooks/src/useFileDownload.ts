//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { log } from '@dxos/log';
import { downloadBlob } from '@dxos/util';

/**
 * Save a blob to disk.
 *
 * Goes through {@link downloadBlob}, so the download also works inside the Tauri webview, where
 * `<a download>` is silently dropped. Blob only: a URL would have to fall back to that anchor, and
 * a caller has no way to notice it did nothing.
 *
 * ```
 * const download = useFileDownload();
 * const handleDownload = (data: string) => {
 *   download(new Blob([data], { type: 'text/plain' }), 'test.txt');
 * };
 * ```
 */
export const useFileDownload = (): ((data: Blob, filename: string) => void) => {
  return useMemo(
    () => (data: Blob, filename: string) => {
      void downloadBlob(data, filename).catch((err) => log.catch(err));
    },
    [],
  );
};
