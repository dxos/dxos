//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Tag, TagProps } from './Tag';

export default {
  title: 'react-ui/Tag',
  component: Tag
};

const Template = ({ children, ...props }: TagProps) => {
  return <Tag {...props}>{children}</Tag>;
};

const defaultProps = {};

export const Default = templateForComponent(Template)(defaultProps);
Default.args = { children: 'Hello' };
