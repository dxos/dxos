//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';

import { withTheme } from '@dxos/storybook-utils';

import { UserAccountAvatar } from './UserAccountAvatar';

const meta: Meta<typeof UserAccountAvatar> = {
  title: 'plugins/plugin-navtree/UserAccountAvatar',
  component: UserAccountAvatar,
  decorators: [withTheme],
};

export default meta;

export const Default = {};
