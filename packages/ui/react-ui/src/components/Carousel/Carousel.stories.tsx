//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '../../testing';
import { translations } from '../../translations';
import { Carousel, type CarouselTransition } from './Carousel';

// Stable placeholder images so the story renders without network fixtures.
const IMAGES = Array.from({ length: 5 }).map((_, index) => `https://placehold.co/640x360?text=Slide+${index + 1}`);

type DefaultStoryProps = {
  count?: number;
  transition?: CarouselTransition;
  continuous?: boolean;
  autoAdvance?: number;
};

const DefaultStory = ({ count = IMAGES.length, transition, continuous, autoAdvance }: DefaultStoryProps) => {
  const images = IMAGES.slice(0, count);
  return (
    <div className='h-full flex items-center'>
      <Carousel.Root count={images.length} transition={transition} continuous={continuous} autoAdvance={autoAdvance}>
        <Carousel.Content>
          <Carousel.Previous />
          <Carousel.Viewport>
            {images.map((src, index) => (
              <Carousel.Slide key={src} index={index} src={src} alt={`Slide ${index + 1}`} />
            ))}
          </Carousel.Viewport>
          <Carousel.Next />
          <Carousel.Indicators />
          <Carousel.Caption>{(index) => `Slide ${index + 1} of ${images.length}`}</Carousel.Caption>
        </Carousel.Content>
      </Carousel.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Carousel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { count: 5 },
};

export const Sliding: Story = {
  args: { count: 5, transition: 'slide' },
};

export const Continuous: Story = {
  args: { count: 5, transition: 'slide', continuous: true },
};

export const AutoAdvancing: Story = {
  args: { count: 5, transition: 'slide', continuous: true, autoAdvance: 5_000 },
};
