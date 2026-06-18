//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout } from '@dxos/react-ui/testing';

import { makeCallState, makeUser, useSeedCallManager, withCallManager } from '../../testing';
import { Call } from './Call';

const self = makeUser('self', 'Alice');
const users = [self, makeUser('bob', 'Bob'), makeUser('carol', 'Carol', { raisedHand: true })];
const state = makeCallState(self, users);

const DefaultStory = () => {
  useSeedCallManager(state);
  return (
    <Call.Root>
      <Call.Viewport>
        <Call.Grid />
        <Call.Toolbar onLeave={() => {}} />
      </Call.Viewport>
    </Call.Root>
  );
};

const meta = {
  title: 'plugins/plugin-calls/components/Call',
  render: DefaultStory,
  decorators: [withCallManager(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
