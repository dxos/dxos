//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import * as Carousel from './Carousel.tsx';

const HUES = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

/** Inline 16:9 slides, so the story needs no network. */
const IMAGES = HUES.map(
  (hue, index) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='360'><rect width='640' height='360' fill='${hue}'/><text x='320' y='200' font-size='64' text-anchor='middle' fill='white'>${index + 1}</text></svg>`,
    )}`,
);

type StoryArgs = { count: number; continuous?: boolean; autoAdvance?: number };

const DefaultStory = ({ count, continuous, autoAdvance }: StoryArgs) => {
  const images = IMAGES.slice(0, count);
  return (
    <Carousel.Root count={images.length} continuous={continuous} autoAdvance={autoAdvance} data-testid='carousel'>
      <Carousel.PrevTrigger />
      <Carousel.ItemGroup>
        {images.map((src, index) => (
          <Carousel.Item key={src} index={index} src={src} alt={`Slide ${index + 1}`} />
        ))}
      </Carousel.ItemGroup>
      <Carousel.NextTrigger />
      <Carousel.IndicatorGroup />
      <Carousel.Caption>{(page) => `Slide ${page + 1} of ${images.length}`}</Carousel.Caption>
    </Carousel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Carousel',
  render: DefaultStory,
  decorators: [withLayout({ classNames: 'p-4 w-[40rem]' }), withTheme()],
  args: { count: 5, continuous: false, autoAdvance: 0 },
  argTypes: { count: { control: { type: 'range', min: 0, max: 5, step: 1 } }, autoAdvance: { control: 'number' } },
  parameters: { layout: 'centered', translations },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const part = (root: HTMLElement, name: string) => [
  ...root.querySelectorAll<HTMLElement>(`[data-scope="carousel"][data-part="${name}"]`),
];

/**
 * The triggers, dots and caption agree on the page in view; the dots are one tab stop whose arrow keys move the page
 * and take focus with it; the triggers flank the slide.
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const root = canvas.getByRole('region', { name: 'Carousel' });
    await expect(root).toHaveAttribute('aria-roledescription', 'carousel');

    const indicators = () => part(canvasElement, 'indicator');
    const current = () => indicators().findIndex((indicator) => indicator.hasAttribute('data-current'));
    const prev = canvas.getByRole('button', { name: 'Previous slide' });
    const next = canvas.getByRole('button', { name: 'Next slide' });

    await expect(indicators()).toHaveLength(5);
    await expect(current()).toBe(0);
    await expect(canvas.getByText('Slide 1 of 5')).toBeVisible();
    await expect(prev).toBeDisabled();

    // The triggers flank the 16:9 track, vertically centred on it.
    const [track] = part(canvasElement, 'item-group');
    const trackRect = track.getBoundingClientRect();
    await expect(trackRect.width / trackRect.height).toBeCloseTo(16 / 9, 1);
    await expect(prev.getBoundingClientRect().right).toBeLessThanOrEqual(trackRect.left);
    await expect(next.getBoundingClientRect().left).toBeGreaterThanOrEqual(trackRect.right);
    const centre = (rect: DOMRect) => rect.top + rect.height / 2;
    await expect(centre(prev.getBoundingClientRect())).toBeCloseTo(centre(trackRect), 0);

    // The slide in view is shown; the others are hidden from assistive tech.
    const slides = part(canvasElement, 'item');
    await expect(slides[0]).toHaveAttribute('aria-roledescription', 'slide');
    // The machine measures which slides are in view after mount, so every slide starts hidden.
    await waitFor(() => expect(within(slides[0]).getByRole('img', { name: 'Slide 1' })).toBeInTheDocument());
    await expect(slides[1]).toHaveAttribute('aria-hidden', 'true');

    await userEvent.click(next);
    await waitFor(() => expect(current()).toBe(1));
    await expect(canvas.getByText('Slide 2 of 5')).toBeVisible();
    await expect(prev).toBeEnabled();

    // One tab stop: only the current dot is tabbable, and the arrow keys carry focus to the new page's dot.
    await expect(indicators().map((indicator) => indicator.tabIndex)).toEqual([-1, 0, -1, -1, -1]);
    indicators()[1].focus();
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => expect(current()).toBe(2));
    await waitFor(() => expect(document.activeElement).toBe(indicators()[2]));
    await userEvent.keyboard('{End}');
    await waitFor(() => expect(current()).toBe(4));
    await waitFor(() => expect(document.activeElement).toBe(indicators()[4]));
    await waitFor(() => expect(next).toBeDisabled());

    // Clicking a dot shows its page.
    await userEvent.click(indicators()[0]);
    await waitFor(() => expect(current()).toBe(0));
  },
};

/** One slide is not a carousel: the controls that would step through it are absent. */
export const TestSingle: Story = {
  args: { count: 1 },
  play: async ({ canvasElement }) => {
    await expect(part(canvasElement, 'item')).toHaveLength(1);
    await expect(part(canvasElement, 'indicator')).toHaveLength(0);
    await expect(within(canvasElement).queryByRole('button', { name: 'Next slide' })).toBeNull();
  },
};
