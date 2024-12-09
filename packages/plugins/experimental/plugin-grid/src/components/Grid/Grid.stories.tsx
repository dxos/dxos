//
// Copyright 2024 DXOS.org
//

import type { Meta } from '@storybook/react';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Grid, type GridProps } from './Grid';

const meta: Meta<GridProps> = {
  title: 'plugins/plugin-grid/Grid',
  component: Grid,
  decorators: [withTheme, withLayout({ fullscreen: true })],
};

export default meta;

export const Default = {};
