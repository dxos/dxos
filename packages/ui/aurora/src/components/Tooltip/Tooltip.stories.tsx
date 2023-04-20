//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { ChatTeardropText } from '@phosphor-icons/react';
import React, { ReactNode } from 'react';

import { Button } from '../Button';
import { TooltipContent, TooltipRoot, TooltipTrigger } from './Tooltip';

export default {
  component: TooltipContent
};

export const Default = {
  render: (args: { trigger: ReactNode; content: ReactNode }) => {
    return (
      <TooltipRoot>
        <TooltipTrigger asChild>{args.trigger}</TooltipTrigger>
        <TooltipContent>{args.content}</TooltipContent>
      </TooltipRoot>
    );
  },
  args: {
    trigger: (
      <Button variant='ghost' className='p-2'>
        <ChatTeardropText className='w-8 h-8' />
      </Button>
    ),
    content: 'Here’s a tooltip for you!'
  }
};
