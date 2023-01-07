//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { ChatTeardropText } from 'phosphor-react';
import React from 'react';

import { Tooltip } from './Tooltip';

export default {
  component: Tooltip
};

export const Default = {
  args: {
    children: <ChatTeardropText className='w-8 h-8' />,
    content: 'Here’s a tooltip for you!'
  }
};
