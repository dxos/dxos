//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';

import { withTheme } from '@dxos/storybook-utils';

import { ShareSpaceButtonImpl } from './ShareSpaceButton';
import translations from '../translations';

const meta: Meta = {
  title: 'plugins/plugin-space/ShareSpaceButton',
  component: ShareSpaceButtonImpl,
  decorators: [withTheme],
  parameters: { translations },
};

export const Default = {
  args: {
    onClick: () => console.log('clicked'),
  },
};
export default meta;
