//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { toMessages } from '../../model/trajectory.ts';
import { entities, events, session } from '../../testing/fixtures.ts';
import { ResearchThread } from './ResearchThread.tsx';

/** Messages are ECHO objects, so they are made in the render rather than passed as story args (which are cloned). */
const DefaultStory = ({ status }: { status: 'running' | 'reported' }) => {
  const messages = useMemo(
    () =>
      status === 'reported'
        ? toMessages(session('reported'), events, entities)
        : toMessages(session('running'), events.slice(0, 4), entities.slice(0, 2)),
    [status],
  );
  return <ResearchThread messages={messages} busy={status === 'running'} onSend={() => {}} />;
};

const meta = {
  title: 'plugins/plugin-lighthouse/components/ResearchThread',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'h-[40rem] w-[26rem]' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Reported: Story = { args: { status: 'reported' } };

export const Running: Story = { args: { status: 'running' } };
