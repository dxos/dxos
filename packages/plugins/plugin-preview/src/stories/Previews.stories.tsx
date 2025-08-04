//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/storybook-utils';

import { translations } from '../translations';

import { Defaultstory, type DefaultstoryProps, createCards } from './testing';

const meta: Meta<DefaultstoryProps> = {
  title: 'plugins/plugin-preview/Card',
  render: Defaultstory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex flex-col justify-center' })],
  parameters: { translations },
  tags: ['cards'],
};

export default meta;

type Story = StoryObj<DefaultstoryProps>;

export const Popover = {
  args: {
    role: 'card--popover',
    cards: createCards(),
  },
} satisfies Story;

export const Intrinsic = {
  args: {
    role: 'card--intrinsic',
    cards: createCards(),
  },
} satisfies Story;

export const Extrinsic = {
  args: {
    role: 'card--extrinsic',
    cards: createCards(),
  },
} satisfies Story;

export const ExtrinsicNoImage = {
  args: {
    role: 'card--extrinsic',
    cards: createCards(false),
  },
} satisfies Story;
