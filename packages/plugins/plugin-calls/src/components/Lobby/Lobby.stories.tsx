//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout } from '@dxos/react-ui/testing';

import { makeCallState, makeUser, useSeedCallManager, withCallManager } from '../../testing';
import { Lobby } from './Lobby';

const self = makeUser('self', 'Alice');
const state = makeCallState(self, [self], { audioEnabled: true, videoEnabled: false });

const DefaultStory = () => {
  useSeedCallManager(state);
  return (
    <Lobby.Root>
      <Lobby.Preview />
      <Lobby.Toolbar roomId='story-room' onJoin={() => {}} />
    </Lobby.Root>
  );
};

const meta = {
  title: 'plugins/plugin-calls/components/Lobby',
  render: DefaultStory,
  decorators: [withCallManager(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
