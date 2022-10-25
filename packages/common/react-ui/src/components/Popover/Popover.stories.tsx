//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Avatar } from '../Avatar';
import { Popover, PopoverProps } from './Popover';

export default {
  title: 'react-ui/Popover',
  component: Popover
};

const Template = ({ children, ...props }: PopoverProps) => {
  return <Popover {...props}>{children}</Popover>;
};

export const Default = templateForComponent(Template)({
  openTrigger: '',
  closeLabel: '',
  children: ''
});
Default.args = {
  openTrigger: (
    <Avatar label={<span>Open popover</span>} fallbackValue='open popover' />
  ),
  children: 'Popover content',
  closeLabel: 'Close'
};
