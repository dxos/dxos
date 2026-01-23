//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../translations';

import { Defaultstory, createCards } from './testing';

faker.seed(999);

const meta = {
  title: 'plugins/plugin-preview/Card',
  render: Defaultstory,
  decorators: [
    withTheme,
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [...corePlugins()],
    }),
  ],
  parameters: {
    translations,
    layout: 'fullscreen',
  },
  tags: ['cards'],
} satisfies Meta<typeof Defaultstory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Popover: Story = {
  args: {
    role: 'card--popover',
    cards: createCards(),
  },
};

export const Intrinsic: Story = {
  args: {
    role: 'card--intrinsic',
    cards: createCards(),
  },
};

export const Extrinsic: Story = {
  args: {
    role: 'card--extrinsic',
    cards: createCards(),
  },
};

export const ExtrinsicNoImage: Story = {
  args: {
    role: 'card--extrinsic',
    cards: createCards(false),
  },
};
