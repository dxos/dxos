//
// Copyright 2022 DXOS.org
//

import React, { FC, ReactNode, useState } from 'react';

export const Pager: FC<{ page: number; length: number }> = ({ page, length }) => {
  return (
    <div style={{ position: 'absolute', bottom: 0, right: 0, padding: 16 }}>
      {page + 1}/{length}
    </div>
  );
};

export const Deck: FC<{ slides: ReactNode[] }> = ({ slides }) => {
  const [page, setPage] = useState<number>(0);

  const Page = () => slides[page];

  const handlePageNext = () => {
    setPage((page) => (page === slides.length - 1 ? 0 : page + 1));
  };
  // const handlePagePrevious = () => {
  //   setPage((page) => (page > 0 ? page - 1 : page));
  // };

  // TODO(burdon): Form-factor (e.g., 16x9) with max dimensions.

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
        flexDirection: 'column'
      }}
      onClick={handlePageNext}
    >
      {/* TODO(burdon): Add pager to slide (with React context). */}
      {/* <Pager page={page} length={slides.length} /> */}

      {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
      {/* @ts-ignore */}
      <Page />
    </div>
  );
};
