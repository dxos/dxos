//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Heading, HeadingProps } from './Heading';

export default {
  title: 'react-ui/Heading',
  component: Heading
};

const Template = ({ children, ...props }: HeadingProps) => {
  return <Heading {...props}>{children}</Heading>;
};

const defaultProps = { level: 1 as const };

export const Default = templateForComponent(Template)(defaultProps);
Default.args = { level: 1, children: 'Hello' };

export const Level2 = () => <Template level={2}>Hello</Template>;
export const Level3 = () => <Template level={3}>Hello</Template>;
export const Level4 = () => <Template level={4}>Hello</Template>;
export const Level5 = () => <Template level={5}>Hello</Template>;
export const Level6 = () => <Template level={6}>Hello</Template>;
