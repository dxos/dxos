//
// Copyright 2023 DXOS.org
//

import React, { type FC, useRef } from 'react';

import { ObjectTable, type ObjectTableProps } from './ObjectTable';

const TableSection: FC<ObjectTableProps> = ({ table }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  return (
    <div className='bs-96 mlb-2 overflow-auto' ref={containerRef}>
      <ObjectTable
        key={table.id} // New component instance per table.
        table={table}
        role='table'
        getScrollElement={() => containerRef.current}
      />
    </div>
  );
};

export default TableSection;
