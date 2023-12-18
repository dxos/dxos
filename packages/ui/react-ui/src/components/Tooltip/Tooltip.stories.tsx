//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import React from 'react';

import { Tooltip } from './Tooltip';
import { withTheme } from '../../testing';
import { Button } from '../Buttons';

type StoryTooltipProps = {
  content: string;
};

const StoryTooltip = ({ content }: StoryTooltipProps) => (
  <Tooltip.Provider>
    <Tooltip.Root defaultOpen>
      <Tooltip.Trigger asChild>
        <Button>Trigger tooltip</Button>
      </Tooltip.Trigger>
      <Tooltip.Content side='right'>
        <Tooltip.Arrow />
        {content}
      </Tooltip.Content>
    </Tooltip.Root>
  </Tooltip.Provider>
);

export default {
  title: 'DXOS UI/Tooltip',
  component: StoryTooltip,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

export const Default = {
  args: {
    content: 'This is the tooltip content',
  },
  parameters: {
    chromatic: { delay: 500 },
  },
};
