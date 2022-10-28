//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import cx from 'classnames';
import React from 'react';

import { defaultFocus, defaultHover, defaultActive } from '../../styles';
import { templateForComponent } from '../../testing';
import { Avatar } from '../Avatar';
import { Button } from '../Button';
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
  openTrigger: <Button>Open popover</Button>,
  children: 'Popover content'
};

export const AvatarTrigger = templateForComponent(Template)({
  openTrigger: (
    <Avatar
      tabIndex={0}
      label={<span className='sr-only'>Open popover</span>}
      fallbackValue='open popover'
      className={cx('button-elevation cursor-pointer rounded-md', defaultHover({}), defaultFocus, defaultActive)}
    />
  ),
  closeLabel: 'Close',
  children: 'Popover content'
});
