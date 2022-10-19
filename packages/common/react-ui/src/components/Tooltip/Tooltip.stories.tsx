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

const Template = ({ children, trigger }: TooltipProps) => {
  return <Tooltip trigger={trigger}>{children}</Tooltip>;
};

export const Default = templateForComponent(Template)({ children: '', trigger: '' });
Default.args = {
  trigger: <ChatTeardropText className='w-8 h-8' />,
  children: 'Here’s a tooltip for you!'
};
