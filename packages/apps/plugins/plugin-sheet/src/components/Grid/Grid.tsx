//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, type HTMLAttributes, useRef } from 'react';

import { columnLetter, posToA1Notation } from '../../model';

export type GridProps = {
  columns: number;
  rows: number;
};

export const Grid = (props: GridProps) => {
  const columnsRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const handleScroll: MainProps['onScroll'] = (ev) => {
    const { scrollTop, scrollLeft } = ev.target as HTMLDivElement;
    columnsRef.current!.scrollLeft = scrollLeft;
    rowsRef.current!.scrollTop = scrollTop;
    // TODO(burdon): Translate doesn't have lag.
    // columnsRef.current!.style.translate = -scrollLeft + 'px';
  };

  return (
    <div className='flex flex-col w-full h-full overflow-hidden'>
      <div className='flex shrink-0 h-8'>
        <div className='flex shrink-0 w-8 bg-neutral-800 border-b border-r border-neutral-700 text-neutral-700'></div>
        <Columns ref={columnsRef} {...props} />
      </div>
      <div className='flex grow overflow-hidden'>
        <Rows ref={rowsRef} {...props} />
        <Main {...props} onScroll={handleScroll} />
      </div>
    </div>
  );
};

type ColumnsProps = GridProps;

const Columns = forwardRef<HTMLDivElement, ColumnsProps>(({ columns }, forwardRef) => {
  return (
    <div ref={forwardRef} className='flex overflow-hidden bg-neutral-800'>
      <div className='flex'>
        {Array.from({ length: columns }, (_, i) => (
          <div
            key={i}
            className='flex items-center justify-center w-40 h-8 border-b border-r border-neutral-700 text-neutral-700'
          >
            {columnLetter(i)}
          </div>
        ))}
      </div>
    </div>
  );
});

type RowsProps = GridProps;

const Rows = forwardRef<HTMLDivElement, RowsProps>(({ rows }, forwardRef) => {
  return (
    <div ref={forwardRef} className='flex flex-col shrink-0 w-8 overflow-hidden bg-neutral-800'>
      <div className='flex flex-col'>
        {Array.from({ length: rows }, (_, i) => (
          <div
            key={i}
            className='flex items-center justify-center w-8 h-8 border-b border-r border-neutral-700 text-neutral-700'
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
});

type MainProps = GridProps & Pick<HTMLAttributes<HTMLDivElement>, 'onScroll'>;

const Main = ({ rows, columns, onScroll }: MainProps) => {
  return (
    <div className='flex grow overflow-auto' onScroll={onScroll}>
      <div className='flex'>
        {Array.from({ length: columns }, (_, column) => (
          <div key={column} className='flex flex-col'>
            {Array.from({ length: rows }, (_, row) => (
              <div key={row}>
                <div className='flex w-40 h-8 items-center justify-center border-r border-b border-neutral-700 text-neutral-700'>
                  {posToA1Notation({ column, row })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
