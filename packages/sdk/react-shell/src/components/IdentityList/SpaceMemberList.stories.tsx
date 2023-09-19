//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';

import { SpaceMemberListImpl } from './SpaceMemberList';
import { alice } from '../../testing/fixtures/identities';

export default {
  component: SpaceMemberListImpl,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = (props: any) => {
  return <SpaceMemberListImpl {...props} members={[alice]} />;
};
