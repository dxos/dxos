//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { InvitationList } from './InvitationList';

export default {
  component: InvitationList,
  actions: { argTypesRegex: '^on.*' },
};

export const Normal = () => {
  return <InvitationList invitations={[]} />;
};
