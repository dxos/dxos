//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Grid, type GridProps } from './Grid';

export default {
  title: 'plugin-sheet/Grid',
  component: Grid,
  render: (args: GridProps) => <Story {...args} />,
  decorators: [withTheme, withFullscreen()],
};
const Story = (props: GridProps) => {
  return <Grid {...props} />;
};

export const Default = {
  args: {
    columns: 50,
    rows: 50,
  },
};
