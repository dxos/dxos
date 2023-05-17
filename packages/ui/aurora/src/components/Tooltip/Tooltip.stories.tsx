//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '../Button';
import { TooltipRoot, TooltipPortal, TooltipContent, TooltipArrow, TooltipTrigger, TooltipProvider } from './Tooltip';

type StoryTooltipProps = {
  content: string;
};

const StoryTooltip = ({ content }: StoryTooltipProps) => (
  <TooltipProvider>
    <TooltipRoot defaultOpen>
      <TooltipTrigger asChild>
        <Button>Trigger tooltip</Button>
      </TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side='right'>
          <TooltipArrow />
          {content}
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
);

export default {
  component: StoryTooltip
};

export const Default = {
  args: {
    content: 'This is the tooltip content'
  }
};
