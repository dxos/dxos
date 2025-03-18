//
// Copyright 2022 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { Tooltip } from './Tooltip';
import { withTheme } from '../../testing';
import { Button } from '../Buttons';

type StoryTooltipProps = {
  content: string;
  defaultOpen?: boolean;
};

const StoryTooltip = ({ content, defaultOpen }: StoryTooltipProps) => (
  <Tooltip.Provider defaultOpen={defaultOpen}>
    <Tooltip.Trigger asChild>
      <Button data-tooltip-content={content} data-tooltip-side='right'>
        Trigger tooltip
      </Button>
    </Tooltip.Trigger>
  </Tooltip.Provider>
);

export default {
  title: 'ui/react-ui-core/Tooltip',
  component: Tooltip,
  render: StoryTooltip,
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

export const Testing = {
  args: {
    defaultOption: true,
    content: 'This is the tooltip content',
  },
  parameters: {
    chromatic: { delay: 500 },
  },
};
