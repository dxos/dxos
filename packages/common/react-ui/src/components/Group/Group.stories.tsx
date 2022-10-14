//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Group } from './Group';

export default {
  title: 'react-ui/Group'
};

export const Default = () => {
  return (
    <Group elevation={3} label={{ level: 2, children: 'Hello' }}>
      This is a group
    </Group>
  );
};
