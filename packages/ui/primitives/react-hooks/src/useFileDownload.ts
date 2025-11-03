//
// Copyright 2023 DXOS.org
//

import { useMemo } from 'react';

/**
 * File download anchor.
 *
 * ```
 * const download = useDownload();
 * const handleDownload = (data: string) => {
 *   download(new Blob([data], { type: 'text/plain' }), 'test.txt');
 * };
 * ```
 */
export const useFileDownload = (): ((data: Blob | string, filename: string) => void) =>
  useMemo(
    () => (data: Blob | string, filename: string) => {
      const url = typeof data === 'string' ? data : URL.createObjectURL(data);
      const element = document.createElement('a');
      element.setAttribute('href', url);
      element.setAttribute('download', filename);
      element.setAttribute('target', 'download');
      element.click();
    },
    [],
  );
