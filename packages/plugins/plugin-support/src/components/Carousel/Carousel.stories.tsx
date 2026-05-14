//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

random.seed(0);

import { translations } from '#translations';

import { Carousel } from './Carousel';

const SAMPLE_IMAGES = [
  {
    src: 'https://dxos.network/plugin-details-chess-dark.png',
    label: random.lorem.sentences(2),
  },
  {
    src: 'https://dxos.network/plugin-details-markdown-dark.png',
    label: random.lorem.sentences(2),
  },
  {
    src: 'https://dxos.network/plugin-details-sheet-dark.png',
    label: random.lorem.sentences(2),
  },
  {
    src: 'https://dxos.network/plugin-details-sketch-dark.png',
    label: random.lorem.sentences(2),
  },
];

const meta = {
  title: 'plugins/plugin-support/components/Carousel',
  component: Carousel,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen', classNames: 'flex justify-center' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof Carousel>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    images: SAMPLE_IMAGES,
  },
};
