//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Transcript } from './Transcript';
import translations from '../../translations';

let start = new Date(Date.now() - 24 * 60 * 60 * 10_000);
const next = () => {
  start = new Date(start.getTime() + Math.random() * 10_000);
  return start;
};

const names = Array.from({ length: 3 }, () => faker.person.fullName());

const createBlock = () => ({
  id: faker.string.uuid(),
  author: faker.helpers.arrayElement(names),
  segments: Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => ({
    started: next(),
    text: faker.lorem.paragraph(),
  })),
});

const meta: Meta<typeof Transcript> = {
  title: 'plugins/plugin-transcription/Transcript',
  component: Transcript,
  render: ({ blocks: initialBlocks = [], ...args }) => {
    const [blocks, setBlocks] = useState(initialBlocks);
    // useEffect(() => {
    //   const i = setInterval(() => {
    //     setBlocks((blocks) => [...blocks, createBlock()]);
    //   }, 5_000);

    //   return () => clearInterval(i);
    // }, []);

    return (
      <div className='flex w-[50rem] h-full'>
        <Transcript {...args} blocks={blocks} />
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

export const Default: Story = {
  args: {
    ignoreAttention: true,
    attendableId: 'story',
    blocks: Array.from({ length: 10 }, createBlock),
  },
};

export const Empty: Story = {
  args: {
    ignoreAttention: true,
    attendableId: 'story',
  },
};
