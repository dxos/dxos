//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Avatar, AvatarProps } from './Avatar';

export default {
  title: 'react-ui/Avatar',
  component: Avatar
};

const Template = ({ children, ...props }: AvatarProps) => {
  return <Avatar {...props} />;
};

const defaultProps = {
  fallbackValue: '',
  label: <span />
};

export const Default = templateForComponent(Template)(defaultProps);
Default.args = {
  fallbackValue:
    '20970b563fc49b5bb194a6ffdff376031a3a11f9481360c071c3fed87874106b',
  label: <span className='sr-only'>Hello</span>
};
