//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Carousel } from './Carousel';

const SAMPLE_IMAGES = [
  {
    src: 'https://dxos.network/plugin-details-chess-dark.png',
    label: 'Chess',
  },
  {
    src: 'https://dxos.network/plugin-details-markdown-dark.png',
    label: 'Markdown',
  },
  {
    src: 'https://dxos.network/plugin-details-sheet-dark.png',
    label: 'Sheet',
  },
  {
    src: 'https://dxos.network/plugin-details-sketch-dark.png',
    label: 'Sketch',
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
    intervalMs: 3000,
  },
};

export const Single: Story = {
  args: {
    images: [SAMPLE_IMAGES[0]],
  },
};

export const NoAutoAdvance: Story = {
  args: {
    images: SAMPLE_IMAGES,
    intervalMs: 0,
  },
};
