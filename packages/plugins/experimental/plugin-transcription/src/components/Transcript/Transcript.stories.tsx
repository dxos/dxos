//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React from 'react';

import { faker } from '@dxos/random';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Transcript } from './Transcript';
import translations from '../../translations';

const meta: Meta<typeof Transcript> = {
  title: 'plugins/plugin-transcription/Transcript',
  component: Transcript,
  render: (args) => {
    return (
      <div className='flex w-[50rem] h-full'>
        <Transcript {...args} />
      </div>
    );
  },
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'flex justify-center',
    }),
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Transcript>;

let start = new Date();
const next = () => {
  start = new Date(start.getTime() - Math.random() * 30_000);
  return start;
};

const names = Array.from({ length: 3 }, () => faker.person.fullName());

export const Default: Story = {
  args: {
    ignoreAttention: true,
    attendableId: 'story',
    blocks: Array.from({ length: 200 }, () => ({
      id: faker.string.uuid(),
      author: faker.helpers.arrayElement(names),
      segments: Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => ({
        started: next(),
        text: faker.lorem.paragraph(),
      })),
    })).reverse(),
  },
};

export const Empty: Story = {
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};
