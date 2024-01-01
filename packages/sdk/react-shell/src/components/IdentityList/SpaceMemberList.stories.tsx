//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { SpaceMemberListImpl } from './SpaceMemberList';
import { alice } from '../../testing';

export default {
  title: 'react-shell/SpaceMemberList',
  component: SpaceMemberListImpl,
  actions: { argTypesRegex: '^on.*' },
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = (props: any) => {
  return <SpaceMemberListImpl {...props} members={[alice]} />;
};
