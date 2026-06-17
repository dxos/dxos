//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout } from '@dxos/react-ui/testing';

import { type UserState } from '../../calls';
import { makeCallState, makeUser, useSeedCallManager, withCallManager } from '../../testing';
import { Participant } from './Participant';

const self = makeUser('self', 'Alice');
const bob = makeUser('bob', 'Bob');
const state = makeCallState(self, [self, bob]);

const DefaultStory = ({ item }: { item: UserState }) => {
  useSeedCallManager(state);
  return (
    <div className='grid grow place-items-center p-4'>
      <div className='aspect-video w-96'>
        <Participant item={item} />
      </div>
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-calls/components/Participant',
  render: DefaultStory,
  decorators: [withCallManager(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Remote: Story = {
  args: { item: bob },
};

export const Self: Story = {
  args: { item: self },
};
