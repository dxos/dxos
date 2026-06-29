//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { makeCallState, makeUser } from '../../testing';
import { type CallDebugPanelProps, CallDebugPanel } from './CallDebugPanel';

const state = makeCallState(makeUser('self', 'Alice'), [
  makeUser('self', 'Alice'),
  makeUser('bob', 'Bob', { raisedHand: true }),
]);

const DefaultStory = (props: CallDebugPanelProps) => (
  <div className='p-4'>
    <CallDebugPanel {...props} />
  </div>
);

const meta = {
  title: 'plugins/plugin-calls/containers/CallDebugPanel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { state },
};

export const Empty: Story = {};
