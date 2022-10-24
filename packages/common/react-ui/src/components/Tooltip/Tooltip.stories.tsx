//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { ChatTeardropText } from 'phosphor-react';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Tooltip, TooltipProps } from './Tooltip';

export default {
  title: 'react-ui/Tooltip',
  component: Tooltip
};

const Template = ({ children, content }: TooltipProps) => {
  return <Tooltip content={content}>{children}</Tooltip>;
};

export const Default = templateForComponent(Template)({ children: '', content: '' });
Default.args = {
  children: <ChatTeardropText className='w-8 h-8' />,
  content: 'Here’s a tooltip for you!'
};
