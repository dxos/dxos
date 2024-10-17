//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { withTheme } from '@dxos/storybook-utils';

import { ShareSpaceButtonImpl } from './ShareSpaceButton';
import translations from '../translations';

export default {
  title: 'plugin-space/ShareSpaceButton',
  component: ShareSpaceButtonImpl,
  decorators: [withTheme],
  parameters: { translations },
};

export const Default = {
  args: {
    onClick: () => console.log('clicked'),
  },
};
