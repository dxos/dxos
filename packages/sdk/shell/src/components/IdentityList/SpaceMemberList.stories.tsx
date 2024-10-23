//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { SpaceMemberListImpl } from './SpaceMemberList';
import { alice } from '../../testing';

export default {
  title: 'sdk/react-shell/SpaceMemberList',
  component: SpaceMemberListImpl,
  actions: { argTypesRegex: '^on.*' },
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = (props: any) => {
  return <SpaceMemberListImpl {...props} members={[alice]} />;
};
