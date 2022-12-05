//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';

// TODO(burdon): Autofocus hook.
export const usePageHandler = (length: number) => {
  const [page, setPage] = useState<number>(0);
  useEffect(() => {
    // https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent
    const handler = (ev: KeyboardEvent) => {
      switch (ev.key) {
        case 'ArrowLeft': {
          setPage((page) => (page > 0 ? page - 1 : page));
          break;
        }
        case 'ArrowRight': {
          setPage((page) => (page === length - 1 ? page : page + 1));
          break;
        }
        default: {
          // console.log(ev.key);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return page;
};
