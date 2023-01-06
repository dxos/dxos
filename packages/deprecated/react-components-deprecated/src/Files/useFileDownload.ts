//
// Copyright 2022 DXOS.org
//

import { useMemo } from 'react';

/**
 * File download anchor.
 *
 * const download = useDownload();
 * const handleDownload = (data: Blob) => {
 *   download(data, 'test.txt');
 * };
 */
export const useFileDownload = (): ((data: Blob, filename: string) => void) =>
  useMemo(
    () => (data: Blob, filename: string) => {
      const element = document.createElement('a');
      element.setAttribute('href', URL.createObjectURL(data));
      element.setAttribute('download', filename);
      element.click();
      console.log(element);
    },
    []
  );
