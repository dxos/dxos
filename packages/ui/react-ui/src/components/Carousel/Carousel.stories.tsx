//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../testing';
import { Carousel } from './Carousel';

// Stable placeholder images so the story renders without network fixtures.
const IMAGES = Array.from({ length: 5 }).map((_, index) => `https://placehold.co/640x360?text=Slide+${index + 1}`);

type StoryArgs = {
  count?: number;
  continuous?: boolean;
  autoAdvance?: number;
};

const DefaultStory = ({ count = IMAGES.length, continuous, autoAdvance }: StoryArgs) => {
  const images = IMAGES.slice(0, count);
  return (
    <div className='h-full flex items-center'>
      <Carousel.Root count={images.length} continuous={continuous} autoAdvance={autoAdvance}>
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

export const Continuous: Story = {
  args: { count: 5, continuous: true },
};

export const AutoAdvancing: Story = {
  args: { count: 5, continuous: true, autoAdvance: 5_000 },
};

export const Single: Story = {
  args: { count: 1 },
};

export const Test: Story = {
  args: { count: 5 },
  // The machine holds every slide in one scroll-snap track, so what identifies the slide on show is
  // which one it reports in view — and the caption, the dots and the two triggers all have to agree
  // with it.
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const part = (name: string) => `[data-scope="carousel"][data-part="${name}"]`;
    const indicators = () => [...canvasElement.querySelectorAll<HTMLElement>(part('indicator'))];
    const current = () => indicators().findIndex((indicator) => indicator.hasAttribute('data-current'));
    const trigger = (name: 'prev-trigger' | 'next-trigger') => {
      const element = canvasElement.querySelector<HTMLButtonElement>(part(name));
      if (!element) {
        throw new Error(`No carousel ${name}`);
      }
      return element;
    };

    await expect(indicators()).toHaveLength(5);
    await expect(current()).toEqual(0);
    await expect(canvas.getByText('Slide 1 of 5')).toBeVisible();
    // Without wrap-around there is nowhere to go back to from the first slide.
    await expect(trigger('prev-trigger')).toBeDisabled();

    await userEvent.click(trigger('next-trigger'));
    await waitFor(async () => expect(current()).toEqual(1));
    await expect(canvas.getByText('Slide 2 of 5')).toBeVisible();
    await expect(trigger('prev-trigger')).toBeEnabled();

    // Focusing a dot shows its slide, so the strip reads as one control rather than five buttons.
    indicators()[4].focus();
    await waitFor(async () => expect(current()).toEqual(4));
    await waitFor(async () => expect(trigger('next-trigger')).toBeDisabled());
  },
};

export const TestSingle: Story = {
  args: { count: 1 },
  // One slide is not a carousel: the controls that would step through it are not drawn at all.
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelectorAll('[data-scope="carousel"][data-part="indicator"]')).toHaveLength(0);
    await expect(canvasElement.querySelector('[data-scope="carousel"][data-part="next-trigger"]')).toBeNull();
  },
};
