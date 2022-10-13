//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Group } from './Group';

export default {
  title: 'react-ui/Group'
};

export const Level1 = () => {
  return (
<Group elevation={3} label={{ level: 2, children: 'Hello' }}>
    This is a group
  </Group>
  );
};
