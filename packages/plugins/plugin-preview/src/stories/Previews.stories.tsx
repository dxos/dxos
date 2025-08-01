//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { createCards, Defaultstory, type DefaultstoryProps } from './testing';
import { translations } from '../translations';

const meta: Meta<DefaultstoryProps> = {
  title: 'plugins/plugin-preview/Card',
  render: Defaultstory,
  decorators: [withTheme, withLayout({ fullscreen: true, classNames: 'flex flex-col justify-center' })],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<DefaultstoryProps>;

export const Extrinsic = {
  args: {
    role: 'card--extrinsic',
    cards: createCards(),
  },
} satisfies Story;

export const Intrinsic = {
  args: {
    role: 'card--intrinsic',
    cards: createCards(),
  },
} satisfies Story;

export const Popover = {
  args: {
    role: 'card--popover',
    cards: createCards(),
  },
} satisfies Story;
