//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import {
  CENTRALIZED_FLOW,
  CENTRALIZED_TEMPLATE,
  DECENTRALIZED_FLOW,
  DECENTRALIZED_TEMPLATE,
} from '@dxos/animation/testing';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { NetworkFlows } from './NetworkFlows.tsx';

const meta = {
  title: 'stories/stories-animation/NetworkFlows',
  component: NetworkFlows,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof NetworkFlows>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Decentralized: Story = {
  args: { flow: DECENTRALIZED_FLOW, template: DECENTRALIZED_TEMPLATE },
};

export const Centralized: Story = {
  args: { flow: CENTRALIZED_FLOW, template: CENTRALIZED_TEMPLATE },
};
