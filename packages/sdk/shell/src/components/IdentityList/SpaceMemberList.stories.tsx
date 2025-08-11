//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { alice } from '../../testing/fixtures';

import { SpaceMemberListImpl } from './SpaceMemberList';

export default {
  title: 'sdk/shell/SpaceMemberList',
  component: SpaceMemberListImpl,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = (props: any) => {
  return <SpaceMemberListImpl {...props} members={[alice]} />;
};
