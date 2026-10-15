//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { type NetworkTemplate } from '@dxos/animation';
import {
  CENTRALIZED_FLOW,
  CENTRALIZED_TEMPLATE,
  DECENTRALIZED_FLOW,
  DECENTRALIZED_TEMPLATE,
} from '@dxos/animation/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { NetworkFlows } from './NetworkFlows.tsx';

type StoryArgs = {
  flow: string;
  template: NetworkTemplate;
  /** Space between the cloud and the belt, and between neighbouring outer networks. */
  gap: number;
  /** Width of the belt of outer networks. */
  spread: number;
  /** 0–1: how far each outer network strays from the belt's centre line. */
  jitter: number;
};

const DefaultStory = ({ flow, template, gap, spread, jitter }: StoryArgs) => {
  const tuned = useMemo<NetworkTemplate>(
    () => ({ ...template, layout: { gap, spread, jitter } }),
    [template, gap, spread, jitter],
  );
  return <NetworkFlows flow={flow} template={tuned} />;
};

const meta = {
  title: 'stories/stories-animation/NetworkFlows',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    flow: { control: false },
    template: { control: false },
    gap: { control: { type: 'range', min: 0, max: 3000, step: 50 } },
    spread: { control: { type: 'range', min: 0, max: 20000, step: 250 } },
    jitter: { control: { type: 'range', min: 0, max: 1, step: 0.05 } },
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Decentralized: Story = {
  args: { flow: DECENTRALIZED_FLOW, template: DECENTRALIZED_TEMPLATE, gap: 400, spread: 7000, jitter: 0.5 },
};

export const Centralized: Story = {
  args: { flow: CENTRALIZED_FLOW, template: CENTRALIZED_TEMPLATE, gap: 500, spread: 9000, jitter: 0.5 },
};
