//
// Copyright 2024 DXOS.org
//

import { type RefObject, useEffect, useState } from 'react';

export const useResizeObserver = <El extends HTMLElement>(ref: RefObject<El>) => {
  const [entry, setEntry] = useState<Omit<ResizeObserverEntry, 'target'>>();

  useEffect(() => {
    const observer = new ResizeObserver(([e]) => {
      setEntry(e);
    });
    const { current } = ref;
    if (!current) {
      return;
    }

    observer.observe(current);
    return () => {
      observer.disconnect();
    };
  }, [ref]);

  return entry;
};
