//
// Copyright 2022 DXOS.org
//

import { RefObject, useRef } from 'react';

type Callback = (data: Blob, filename: string) => void

/**
 * File download anchor.
 *
 * const [ref, download] = useDownload();
 * const handleDownload = (data: Blob) => {
 *   download(data, 'test.txt');
 * };
 * return (
 *   <a ref={ref} />
 * );
 */
export const useFileDownload = (): [RefObject<HTMLAnchorElement>, Callback] => {
  const ref = useRef<HTMLAnchorElement>(null);

  // TODO(burdon): Set. MIME type?
  // https://developer.mozilla.org/en-US/docs/Web/API/HTMLAnchorElement/download
  const handleDownload = (data: Blob, filename: string) => {
    const element = ref.current!;
    element.setAttribute('href', URL.createObjectURL(data));
    element.setAttribute('download', filename);
    element.click();
  };

  return [ref, handleDownload];
}
