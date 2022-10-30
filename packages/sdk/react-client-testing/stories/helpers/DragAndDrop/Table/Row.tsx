//
// Copyright 2022 DXOS.org
//

import { Row as RowDef } from '@tanstack/react-table';
import React, { CSSProperties } from 'react';

export interface RowProps {
  row: RowDef<any>;
  style?: CSSProperties;
}

export const Row = ({ row, style }: RowProps) => (
  <div style={style}>
    {row.getVisibleCells().map((cell) => (
      <div
        key={cell.id}
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          padding: 8
        }}
      >
        {cell.renderCell()}
      </div>
    ))}
  </div>
);
