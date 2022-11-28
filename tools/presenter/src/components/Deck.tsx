//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, useEffect, useState } from 'react';

// TODO(burdon): Insert React control via remark layout plugin?
export const Pager: FC<{ page: number; length: number }> = ({ page, length }) => {
  return (
    <div className='absolute bottom-1 right-1 font-mono text-3xl'>
      {page + 1}/{length}
    </div>
  );
};

// TODO(burdon): Factor out hooks.
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
          console.log(ev.key);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return page;
};

export const Deck: FC<{ slides: ReactNode[] }> = ({ slides }) => {
  const page = usePageHandler(slides.length);
  const Page = () => slides[page];

  // prettier-ignore
  return (
    <div
      // TODO(burdon): Use tailwind.
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        overflow: 'hidden',
        flexDirection: 'column'
      }}
    >
      {/* TODO(burdon): Show/hide based on front-matter. */}
      <Pager page={page} length={slides.length} />

      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <Page />
    </div>
  );
};
