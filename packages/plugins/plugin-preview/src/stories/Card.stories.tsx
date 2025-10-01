//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { IntentPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';

import { Defaultstory, createCards } from './testing';

const meta = {
  title: 'plugins/plugin-preview/Card',
  render: Defaultstory,
  decorators: [
    // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({ plugins: [IntentPlugin()] }),
    withTheme,
    withLayout({
      fullscreen: true,
      classNames: 'flex flex-col justify-center',
    }),
  ],
  parameters: { translations },
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
