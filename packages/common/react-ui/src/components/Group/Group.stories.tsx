//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../dev-util';
import { Group, GroupProps } from './Group';

export default {
  title: 'react-ui/Group',
  component: Group
};

const Template = ({ children, ...props }: GroupProps) => {
  return <Group {...props}>{children}</Group>;
};

export const Default = templateForComponent(Template)({ label: {} });
Default.args = {
  label: { level: 3, children: 'Hello' },
  children: 'This is a group.',
  elevation: 3
};
