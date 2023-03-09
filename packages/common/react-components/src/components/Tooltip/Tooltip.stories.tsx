//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { ChatTeardropText } from 'phosphor-react';
import React, { ReactNode } from 'react';

import { TooltipContent, TooltipRoot, TooltipTrigger } from './Tooltip';

export default {
  component: TooltipContent
};

export const Default = {
  render: (args: { trigger: ReactNode; content: ReactNode }) => {
    return (
      <TooltipRoot>
        <TooltipTrigger>{args.trigger}</TooltipTrigger>
        <TooltipContent>{args.content}</TooltipContent>
      </TooltipRoot>
    );
  },
  args: {
    trigger: <ChatTeardropText className='w-8 h-8' />,
    content: 'Here’s a tooltip for you!'
  }
};
