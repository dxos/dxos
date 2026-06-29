//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout } from '@dxos/react-ui/testing';

import { makeCallState, makeUser, useSeedCallManager, withCallManager } from '../../testing';
import { Toolbar, type ToolbarProps } from './Toolbar';

const self = makeUser('self', 'Alice');
const state = makeCallState(self, [self, makeUser('bob', 'Bob')]);

const DefaultStory = (props: ToolbarProps) => {
  useSeedCallManager(state);
  return (
    <div className='flex justify-center p-4'>
      <Toolbar {...props} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-calls/components/Toolbar',
  render: DefaultStory,
  decorators: [withCallManager(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const InRoom: Story = {
  args: { isInRoom: true, participants: 2, onLeave: () => {} },
};

export const Lobby: Story = {
  args: { isInRoom: false, participants: 2, onJoin: () => {} },
};
