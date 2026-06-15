//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout } from '@dxos/react-ui/testing';

import { makeCallState, makeUser, useSeedCallManager, withCallManager } from '../../testing';
import { CallSidebar } from './CallSidebar';

const self = makeUser('self', 'Alice');
const state = makeCallState(self, [self, makeUser('bob', 'Bob'), makeUser('carol', 'Carol')]);

const DefaultStory = () => {
  useSeedCallManager(state);
  return <CallSidebar />;
};

const meta = {
  title: 'plugins/plugin-calls/containers/CallSidebar',
  render: DefaultStory,
  decorators: [withCallManager(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
