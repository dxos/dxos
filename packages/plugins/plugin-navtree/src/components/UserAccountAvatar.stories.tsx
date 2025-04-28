//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { UserAccountAvatar } from './UserAccountAvatar';

export const Default = (props: any) => {
  return <UserAccountAvatar {...props} />;
};

const meta: Meta<typeof UserAccountAvatar> = {
  title: 'plugins/plugin-navtree/UserAccountAvatar',
  component: UserAccountAvatar,
};

export default meta;
