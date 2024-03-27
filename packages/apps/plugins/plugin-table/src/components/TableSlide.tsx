//
// Copyright 2023 DXOS.org
//

import React, { type FC, useRef } from 'react';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableSlide: FC<ObjectTableProps> = ({ table }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  return (
    <div role='none' className='flex-1 min-bs-0 pli-16 plb-24'>
      <div role='none' className='bs-full overflow-auto grid place-items-center' ref={containerRef}>
        <ObjectTable
          key={table.id} // New component instance per table.
          table={table}
          stickyHeader
          role='table'
          getScrollElement={() => containerRef.current}
        />
      </div>
    </div>
  );
};

export default TableSlide;
