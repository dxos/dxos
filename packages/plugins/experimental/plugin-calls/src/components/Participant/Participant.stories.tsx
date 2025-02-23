//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Participant, type ParticipantProps } from './Participant';

const meta: Meta<ParticipantProps> = {
  title: 'plugins/plugin-calls/Participant',
  component: Participant,
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
    }),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<ParticipantProps>;

export const Default: Story = {
  args: {},
};
