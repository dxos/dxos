//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withTheme } from '../../testing';
import { Carousel } from './Carousel';

// Stable placeholder images so the story renders without network fixtures.
const IMAGES = Array.from({ length: 5 }).map(
  (_, index) => `https://placehold.co/640x360?text=Slide+${index + 1}`,
);

type DefaultStoryProps = { count?: number };

const DefaultStory = ({ count = IMAGES.length }: DefaultStoryProps) => {
  const images = IMAGES.slice(0, count);
  return (
    <Carousel.Root count={images.length}>
      <Carousel.Content classNames='max-w-[40rem]'>
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
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Carousel',
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { count: 5 },
};
