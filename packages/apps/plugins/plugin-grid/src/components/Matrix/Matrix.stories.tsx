//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Matrix, type MatrixProps } from './Matrix';

// TODO(burdon): Experiments.
// "grid": "^4.10.8",
// "gridstack": "^10.2.0",

export default {
  title: 'plugin-grid/Matrix',
  component: Matrix,
  render: (args: MatrixProps) => <Matrix {...args} />,
  decorators: [withTheme, withFullscreen()],
};

const data = [[1000, 100], [2000, 101], [3000, 102], [], ['=SUM(A1:A3)', '=SUM(B1:B3)']];

export const Default = {
  args: {
    editable: true,
    data,
  },
};

export const Data = {
  args: {
    editable: true,
    data,
  },
};

export const Readonly = {
  args: {
    editable: false,
    data,
  },
};
