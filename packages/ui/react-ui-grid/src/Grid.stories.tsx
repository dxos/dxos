//
// Copyright 2024 DXOS.org
//

import { withTheme } from '@dxos/storybook-utils';

import { Grid } from './Grid';

export default {
  title: 'react-ui-grid/Grid',
  component: Grid,
  decorators: [withTheme],
};

const basicContent = {
  ':g1': {
    pos: '1,1',
    end: '8,1',
    value: 'Weekly sales report',
  },
};

export const Basic = {
  args: { values: basicContent },
};
