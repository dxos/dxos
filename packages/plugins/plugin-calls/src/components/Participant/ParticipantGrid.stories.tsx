//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { withLayout } from '@dxos/react-ui/testing';

import { makeCallState, makeUser, useSeedCallManager, withCallManager } from '../../testing';
import { ParticipantGrid } from './ParticipantGrid';

const self = makeUser('self', 'Alice');
const everyone = [
  self,
  makeUser('bob', 'Bob'),
  makeUser('carol', 'Carol', { raisedHand: true }),
  makeUser('dave', 'Dave', { tracks: { audioEnabled: false, videoEnabled: true } }),
];

type StoryArgs = { debug?: boolean; solo?: boolean };

const DefaultStory = ({ debug, solo }: StoryArgs) => {
  const users = useMemo(() => (solo ? [self] : everyone), [solo]);
  const state = useMemo(() => makeCallState(self, users), [users]);
  useSeedCallManager(state);
  return <ParticipantGrid self={self} users={users} debug={debug} />;
};

const meta = {
  title: 'plugins/plugin-calls/components/ParticipantGrid',
  render: DefaultStory,
  decorators: [withCallManager(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Debug: Story = {
  args: { debug: true },
};

export const Solo: Story = {
  args: { solo: true },
};
