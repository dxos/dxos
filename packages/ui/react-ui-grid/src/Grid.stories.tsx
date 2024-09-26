//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Grid, type GridContentProps, type GridRootProps } from './Grid';

type StoryGridProps = GridContentProps & Pick<GridRootProps, 'onEditingChange'>;

const StoryGrid = ({ onEditingChange, ...props }: StoryGridProps) => {
  return (
    <Grid.Root id='story' onEditingChange={onEditingChange}>
      <Grid.Content {...props} />
    </Grid.Root>
  );
};

export default {
  title: 'react-ui-grid/Grid',
  component: StoryGrid,
  decorators: [withTheme],
  parameters: { layout: 'fullscreen' },
};

export const Basic = {
  args: {
    id: 'story',
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
  } satisfies StoryGridProps,
};
