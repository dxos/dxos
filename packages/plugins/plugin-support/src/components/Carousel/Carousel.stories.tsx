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
  {
    src: 'https://customer-5rxcjpyab08avpmn.cloudflarestream.com/f58459bcdf3a6f3e93644a4e0f39b22a/iframe?poster=https%3A%2F%2Fcustomer-5rxcjpyab08avpmn.cloudflarestream.com%2Ff58459bcdf3a6f3e93644a4e0f39b22a%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600',
    description: random.lorem.sentences(2),
  },
  {
    src: 'https://dxos.network/plugin-details-chess-dark.png',
    description: random.lorem.sentences(2),
  },
  {
    src: 'https://dxos.network/plugin-details-markdown-dark.png',
    description: random.lorem.sentences(2),
  },
  {
    src: 'https://dxos.network/plugin-details-sheet-dark.png',
    description: random.lorem.sentences(2),
  },
  {
    src: 'https://dxos.network/plugin-details-sketch-dark.png',
    description: random.lorem.sentences(2),
  },
];

type DefaultStoryProps = { slides: Slide[]; intervalMs?: number };

const DefaultStory = ({ slides, intervalMs }: DefaultStoryProps) => (
  <Carousel.Root classNames='pt-4' count={slides.length} intervalMs={intervalMs}>
    <Carousel.Frame>
      <Carousel.Previous />
      <Carousel.Viewport>
        {slides.map((slide, i) => (
          <Carousel.Slide key={slide.src} index={i}>
            <Carousel.Media src={slide.src} alt={slide.description} />
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
