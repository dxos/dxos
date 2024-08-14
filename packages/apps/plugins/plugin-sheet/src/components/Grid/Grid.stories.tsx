//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Grid, type GridRootProps } from './Grid';

export default {
  title: 'plugin-sheet/Grid',
  component: Grid,
  render: (args: GridRootProps) => <Story {...args} />,
  decorators: [withTheme, withFullscreen()],
};

const Story = (props: GridRootProps) => {
  return <Grid.Root {...props} />;
};

export const Default = {
  args: {
    rows: 100,
    columns: 52,
  },
};
