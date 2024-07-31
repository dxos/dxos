//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import { withTheme, withFullscreen } from '@dxos/storybook-utils';

import { Matrix } from './Matrix';

export default {
  title: 'plugin-grid/Matrix',
  component: Matrix,
  decorators: [withTheme, withFullscreen()],
};

export const Default = {};
