//
// Copyright 2025 DXOS.org
//

import React from 'react';

export namespace Unit {
  export const KB = (n?: number) => ((n ?? 0) / 1_000).toFixed(2);
}

export type TableProps = {
  rows: (string | number)[][];
};

export const Table = ({ rows }: TableProps) => (
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
