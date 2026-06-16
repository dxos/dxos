//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout } from '@dxos/react-ui/testing';

import { makeCallState, makeUser, useSeedCallManager, withCallManager } from '../../testing';
import { CallArticle } from './CallArticle';

const self = makeUser('self', 'Alice');
const state = makeCallState(self, [self, makeUser('bob', 'Bob'), makeUser('carol', 'Carol', { raisedHand: true })]);

const DefaultStory = () => {
  useSeedCallManager(state);
  // CallArticle reads only the CallManager; the room id identifies the call to join.
  return <CallArticle roomId='story-room' />;
};

const meta = {
  title: 'plugins/plugin-calls/containers/CallArticle',
  render: DefaultStory,
  decorators: [withCallManager(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
