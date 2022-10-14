//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../dev-util';
import { Heading, HeadingProps } from './Heading';

export default {
  title: 'react-ui/Heading',
  component: Heading
};

const Template = ({ children, ...props }: HeadingProps) => {
  return <Heading {...props}>{children}</Heading>;
};

const defaultProps = { level: 1 as const };

export const Level1 = templateForComponent(Template)(defaultProps);
Level1.args = { level: 1, children: 'Hello' };

export const Level2 = templateForComponent(Template)(defaultProps);
Level2.args = { level: 2, children: 'Hello' };

export const Level3 = templateForComponent(Template)(defaultProps);
Level3.args = { level: 3, children: 'Hello' };

export const Level4 = templateForComponent(Template)(defaultProps);
Level4.args = { level: 4, children: 'Hello' };

export const Level5 = templateForComponent(Template)(defaultProps);
Level5.args = { level: 5, children: 'Hello' };

export const Level6 = templateForComponent(Template)(defaultProps);
Level6.args = { level: 6, children: 'Hello' };
