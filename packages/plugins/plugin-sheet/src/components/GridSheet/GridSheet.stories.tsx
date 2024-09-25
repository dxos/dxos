//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { GridSheet, type GridSheetProps } from './GridSheet';

const StorySheetGrid = (props: GridSheetProps) => {
  return <GridSheet {...props} />;
};

export default {
  title: 'plugin-sheet/GridSheet',
  component: StorySheetGrid,
  decorators: [withTheme],
  parameters: { layout: 'fullscreen' },
};

export const Basic = {
  args: {
    id: 'story-grid',
    cells: {
      '1,1': {
        // end: '8,1',
        value: 'Weekly sales report',
      },
    },
    columnDefault: {
      size: 180,
      resizeable: true,
    },
    rowDefault: {
      size: 32,
      resizeable: true,
    },
    columns: {
      0: { size: 200 },
      1: { size: 210 },
      2: { size: 230 },
      3: { size: 250 },
      4: { size: 270 },
    },
    onAxisResize: (event) => {
      console.log('[axis resize]', event);
    },
    onEditingChange: (event) => {
      console.log('[edit]', event);
    },
  } satisfies GridSheetProps,
};
