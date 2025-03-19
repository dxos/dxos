//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';

import { faker } from '@dxos/random';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Transcript } from './Transcript';
import translations from '../../translations';

const meta: Meta<typeof Transcript> = {
  title: 'plugins/plugin-transcription/Transcript',
  component: Transcript,
  decorators: [
    withTheme,
    withLayout({
      tooltips: true,
      fullscreen: true,
      classNames: 'grid',
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
    blocks: Array.from({ length: 256 }, () => ({
      id: faker.string.uuid(),
      author: faker.helpers.arrayElement(names),
      segments: Array.from({ length: 1 + Math.floor(Math.random() * 12) }, () => ({
        started: next(),
        text: faker.lorem.paragraph(),
      })),
    })).reverse(),
    ignoreAttention: true,
    attendableId: 'story',
  },
};

export const Empty: Story = {
  args: { ignoreAttention: true, attendableId: 'story' },
};
