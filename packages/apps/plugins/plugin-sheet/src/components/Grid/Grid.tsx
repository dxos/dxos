//
// Copyright 2024 DXOS.org
//

import React, { forwardRef, type HTMLAttributes, useRef, useState } from 'react';

import { mx } from '@dxos/react-ui-theme';

import { columnLetter, cellToA1Notation } from '../../model';

type SelectionProps = { selected?: number; onSelect?: (selected: number) => void };

export type GridProps = {
  columns: number;
  rows: number;
};

export const Grid = (props: GridProps) => {
  const [{ column, row }, setSelected] = useState<{ column?: number; row?: number }>({});
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
        <Columns ref={columnsRef} {...props} selected={column} onSelect={(column) => setSelected(() => ({ column }))} />
      </div>
      <div className='flex grow overflow-hidden'>
        <Rows ref={rowsRef} {...props} selected={row} onSelect={(row) => setSelected(() => ({ row }))} />
        <Main {...props} selected={{ row, column }} onScroll={handleScroll} />
      </div>
    </div>
  );
};

type ColumnsProps = GridProps & SelectionProps;

const Columns = forwardRef<HTMLDivElement, ColumnsProps>(({ columns, selected, onSelect }, forwardRef) => {
  return (
    <div ref={forwardRef} className='flex overflow-hidden bg-neutral-800'>
      <div className='flex'>
        {Array.from({ length: columns }, (_, column) => (
          <div
            key={column}
            className={mx(
              'flex items-center justify-center w-40 h-8',
              'border-b border-r border-neutral-700 text-neutral-700 cursor-pointer',
              column === selected && 'bg-primary-500 text-white',
            )}
            onClick={() => onSelect?.(column)}
          >
            {columnLetter(column)}
          </div>
        ))}
      </div>
    </div>
  );
});

type RowsProps = GridProps & SelectionProps;

const Rows = forwardRef<HTMLDivElement, RowsProps>(({ rows, selected, onSelect }, forwardRef) => {
  return (
    <div ref={forwardRef} className='flex flex-col shrink-0 w-8 overflow-hidden bg-neutral-800'>
      <div className='flex flex-col'>
        {Array.from({ length: rows }, (_, column) => (
          <div
            key={column}
            className={mx(
              'flex items-center justify-center w-8 h-8',
              'border-b border-r border-neutral-700 text-neutral-700 cursor-pointer',
              column === selected && 'bg-primary-500 text-white',
            )}
            onClick={() => onSelect?.(column)}
          >
            {column + 1}
          </div>
        ))}
      </div>
    </div>
  );
});

type MainProps = GridProps & { selected: { row?: number; column?: number } } & Pick<
    HTMLAttributes<HTMLDivElement>,
    'onScroll'
  >;

const Main = ({ rows, columns, selected, onScroll }: MainProps) => {
  return (
    <div className='flex grow overflow-auto' onScroll={onScroll}>
      <div className='flex'>
        {Array.from({ length: columns }, (_, column) => (
          <div key={column} className='flex flex-col'>
            {Array.from({ length: rows }, (_, row) => (
              <div key={row}>
                <div
                  className={mx(
                    'flex w-40 h-8 items-center justify-center',
                    'border-r border-b border-neutral-700 text-neutral-700',
                    (column === selected.column || row === selected.row) && 'bg-primary-500 text-white',
                  )}
                >
                  {cellToA1Notation({ column, row })}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
