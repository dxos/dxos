//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { toMessages } from '../../model/trajectory.ts';
import { entities, events, session } from '../../testing/fixtures.ts';
import { ResearchThread } from './ResearchThread.tsx';

const meta = {
  title: 'plugins/plugin-lighthouse/components/ResearchThread',
  component: ResearchThread,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'h-[40rem] w-[26rem]' })],
  parameters: { translations },
} satisfies Meta<typeof ResearchThread>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Reported: Story = {
  args: { messages: toMessages(session('reported'), events, entities), onSend: () => {} },
};

export const Running: Story = {
  args: {
    messages: toMessages(session('running'), events.slice(0, 4), entities.slice(0, 2)),
    busy: true,
    onSend: () => {},
  },
};
