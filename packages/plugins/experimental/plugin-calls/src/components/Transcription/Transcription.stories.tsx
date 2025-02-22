//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { faker } from '@dxos/random';
import { ScrollContainer } from '@dxos/react-ui-components';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { TranscriptionList } from './Transcription';

const meta: Meta<typeof TranscriptionList> = {
  title: 'plugins/plugin-calls/TranscriptionList',
  component: TranscriptionList,
  render: (args) => (
    <div className='flex w-96'>
      <ScrollContainer classNames='p-2'>
        <TranscriptionList {...args} />
      </ScrollContainer>
    </div>
  ),
  decorators: [
    withTheme,
    withLayout({
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
};

export default meta;

type Story = StoryObj<typeof TranscriptionList>;

let start = new Date();
const next = () => {
  start = new Date(start.getTime() + Math.random() * 5_000);
  return start;
};

export const Default: Story = {
  args: {
    blocks: Array.from({ length: 6 + Math.floor(Math.random()) * 10 }, () => ({
      id: faker.string.uuid(),
      author: faker.person.fullName(),
      segments: Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => ({
        timestamp: next(),
        text: faker.lorem.paragraph(),
      })),
    })),
  },
};
