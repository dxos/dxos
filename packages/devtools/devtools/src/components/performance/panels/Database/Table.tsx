//
// Copyright 2025 DXOS.org
//

import React from 'react';

export const formatNumber = (n?: number, d = 1, p = 2) => ((n ?? 0) / d).toFixed(p);

export type TableProps = {
  rows: string[][];
};

export const Table = ({ rows }: TableProps) => {
  return (
    <div className='w-full text-xs font-mono'>
      {rows.map(([prefix, label, value, unit], i) => (
        <div key={i} className='grid grid-cols-[1rem_2fr_1fr_3rem]'>
          <div className='p-1 text-subdued'>{prefix}</div>
          <div className='p-1 truncate'>{label}</div>
          <div className='p-1 text-right'>{value}</div>
          <div className='p-1 text-subdued'>{unit}</div>
        </div>
      ))}
    </div>
  );
};
