//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { random } from '@dxos/random';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Carousel } from './Carousel';

random.seed(0);

type Slide = { src: string; description: string };

const SAMPLE_SLIDES: Slide[] = [
  { src: 'https://dxos.network/plugin-details-chess-dark.png', description: random.lorem.sentences(2) },
  { src: 'https://dxos.network/plugin-details-markdown-dark.png', description: random.lorem.sentences(2) },
  { src: 'https://dxos.network/plugin-details-sheet-dark.png', description: random.lorem.sentences(2) },
  { src: 'https://dxos.network/plugin-details-sketch-dark.png', description: random.lorem.sentences(2) },
];

type DefaultStoryProps = { slides: Slide[]; intervalMs?: number };

const DefaultStory = ({ slides, intervalMs }: DefaultStoryProps) => (
  <Carousel.Root count={slides.length} intervalMs={intervalMs}>
    <Carousel.Frame>
      <Carousel.Previous />
      <Carousel.Viewport>
        {slides.map((slide, i) => (
          <Carousel.Slide key={slide.src} index={i}>
            <img
              src={slide.src}
              alt={slide.description}
              className='absolute inset-0 w-full h-full object-cover'
              loading='lazy'
            />
          </Carousel.Slide>
        ))}
      </Carousel.Viewport>
      <Carousel.Next />
    </Carousel.Frame>
    <Carousel.Indicators />
    <Carousel.Caption>{(i) => slides[i]?.description}</Carousel.Caption>
  </Carousel.Root>
);

const meta = {
  title: 'plugins/plugin-support/components/Carousel',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen', classNames: 'flex justify-center' })],
  parameters: { layout: 'fullscreen', translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { slides: SAMPLE_SLIDES },
};
