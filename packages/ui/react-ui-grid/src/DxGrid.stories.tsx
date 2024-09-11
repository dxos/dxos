//
// Copyright 2024 DXOS.org
//

import { withTheme } from '@dxos/storybook-utils';

import { DxGrid } from './DxGrid';

export default {
  title: 'react-ui-grid/DxGrid',
  component: DxGrid,
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
