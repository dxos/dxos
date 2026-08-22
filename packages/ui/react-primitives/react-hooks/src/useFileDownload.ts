//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

import { log } from '@dxos/log';
import { downloadBlob, downloadUrl } from '@dxos/util';

/**
 * File download anchor.
 *
 * Blobs are saved via {@link downloadBlob} so the download also works inside the Tauri webview,
 * where `<a download>` is silently dropped. A string is treated as an already-addressable URL.
 *
 * ```
 * const download = useFileDownload();
 * const handleDownload = (data: string) => {
 *   download(new Blob([data], { type: 'text/plain' }), 'test.txt');
 * };
 * ```
 */
export const useFileDownload = (): ((data: Blob | string, filename: string) => void) => {
  return useMemo(
    () => (data: Blob | string, filename: string) => {
      if (typeof data === 'string') {
        downloadUrl(data, filename);
        return;
      }

      void downloadBlob(data, filename).catch((err) => log.catch(err));
    },
    [],
  );
};
