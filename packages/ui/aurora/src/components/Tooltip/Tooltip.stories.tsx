//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Button } from '../Buttons';
import { Tooltip } from './Tooltip';

type StoryTooltipProps = {
  content: string;
};

const StoryTooltip = ({ content }: StoryTooltipProps) => (
  <Tooltip.Provider>
    <Tooltip.Root defaultOpen>
      <Tooltip.Trigger asChild>
        <Button>Trigger Tooltip</Button>
      </Tooltip.Trigger>
      <Tooltip.Content side='right'>
        <Tooltip.Arrow />
        {content}
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
);

export default {
  component: StoryTooltip,
};

export const Default = {
  args: {
    content: 'This is the tooltip content',
  },
  parameters: {
    chromatic: { delay: 500 },
  },
};
