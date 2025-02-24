//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { faker } from '@dxos/random';
import { ScrollContainer } from '@dxos/react-ui-components';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Transcription } from './Transcription';

const meta: Meta<typeof Transcription> = {
  title: 'plugins/plugin-calls/Transcription',
  component: Transcription,
  render: (args) => (
    <div className='flex w-[500px] p-2'>
      <ScrollContainer>
        <Transcription {...args} />
      </ScrollContainer>
    </div>
  ),
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'justify-center',
    }),
  ],
};

export default meta;

type Story = StoryObj<typeof Transcription>;

let start = new Date();
const next = () => {
  start = new Date(start.getTime() - Math.random() * 30_000);
  return start;
};

const names = Array.from({ length: 3 }, () => faker.person.fullName());

export const Default: Story = {
  args: {
    blocks: Array.from({ length: 6 + Math.floor(Math.random()) * 15 }, () => ({
      id: faker.string.uuid(),
      author: faker.helpers.arrayElement(names),
      segments: Array.from({ length: 1 + Math.floor(Math.random() * 3) }, () => ({
        started: next(),
        text: faker.lorem.paragraph(),
      })),
    })).reverse(),
  },
};

export const Empty: Story = {}
