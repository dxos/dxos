//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Matrix, type MatrixProps } from './Matrix';
import { type CellValue } from './context';
import { posToA1Notation } from './types';

// TODO(burdon): Experiments.
// "grid": "^4.10.8",
// "gridstack": "^10.2.0",

export default {
  title: 'plugin-grid/Matrix',
  component: Matrix,
  render: (args: MatrixProps) => <Matrix {...args} />,
  decorators: [withTheme, withFullscreen()],
};

const createData = (rows: number, columns: number): MatrixProps['data'] => {
  const data: MatrixProps['data'] = [];

  const date = new Date();
  data.push(
    Array.from({ length: columns }, (_, i) => {
      date.setMonth(date.getMonth() + 1);
      return date.toLocaleString('en-US', { month: 'short' });
    }),
  );
  data.push([]);

  for (let i = 0; i < rows; i++) {
    const row: CellValue[] = [];
    for (let j = 0; j < columns; j++) {
      row.push(Math.floor(Math.random() * 10_000));
    }

    data.push(row);
  }

  data.push([]);
  data.push(
    Array.from(
      { length: columns },
      (_, i) => `=SUM(${posToA1Notation({ row: 2, column: i })}:${posToA1Notation({ row: 2 + rows, column: i })})`,
    ),
  );

  return data;
};

export const Default = {
  args: {
    editable: true,
    data: createData(5, 3),
  },
};

export const Data = {
  args: {
    editable: true,
    data: createData(5, 3),
  },
};

export const Readonly = {
  args: {
    editable: false,
    data: createData(5, 3),
  },
};
