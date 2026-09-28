//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { expectTooltip } from '../../testing.ts';

/** Inline SVG, so the story never fetches from the network. */
const POSTER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'>
    <defs><linearGradient id='g' x2='1' y2='1'><stop offset='0' stop-color='#f472b6'/><stop offset='1' stop-color='#6366f1'/></linearGradient></defs>
    <rect width='320' height='180' fill='url(#g)'/><circle cx='80' cy='60' r='28' fill='#fef3c7'/>
  </svg>`,
)}`;

type StoryArgs = {
  /** Source of the first card's poster. */
  poster?: string;
};

const DefaultStory = ({ poster = POSTER }: StoryArgs) => (
  <div className='nx-scope @container w-[48rem] border border-separator' data-size='md'>
    <Next.Container gutter='rail' level='base' data-testid='host'>
      <div className='grid grid-cols-3 items-start gap-4 py-4'>
        <Next.Card.Root data-testid='poster-card'>
          <Next.Card.Poster src={poster} alt='Launch artwork' data-testid='poster' />
          <Next.Card.Header>
            <Next.Card.Title>Launch</Next.Card.Title>
          </Next.Card.Header>
          <Next.Card.Body>
            <Next.Card.Description>The first public release, with sharing and sync.</Next.Card.Description>
          </Next.Card.Body>
          <Next.Card.Footer>
            <Next.Button variant='primary'>Open</Next.Button>
          </Next.Card.Footer>
        </Next.Card.Root>

        <Next.Card.Root data-testid='card'>
          <Next.Card.Header data-testid='header'>
            <Next.Card.Title>Roadmap</Next.Card.Title>
            <Next.IconButton icon='ph--dots-three--regular' label='More actions' />
          </Next.Card.Header>
          <Next.Card.Body data-testid='body'>
            <Next.Card.Description>What ships next quarter and why.</Next.Card.Description>
            <Next.Typography>Three milestones, each with an owner and a date.</Next.Typography>
          </Next.Card.Body>
          <Next.Card.Footer data-testid='footer'>
            <Next.Button>Dismiss</Next.Button>
            <Next.Button variant='primary'>Review</Next.Button>
          </Next.Card.Footer>
        </Next.Card.Root>

        <Next.Card.Root>
          <Next.Card.Header>
            <Next.Card.Title>Notes</Next.Card.Title>
            <Next.Block>
              <Next.Icon icon='ph--note--regular' />
            </Next.Block>
          </Next.Card.Header>
          <Next.Card.Body>
            <Next.Typography>A card with no footer.</Next.Typography>
          </Next.Card.Body>
        </Next.Card.Root>
      </div>
    </Next.Container>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/card',
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** The card lifts one level above its host, and title, body and footer share the content edge. */
export const Layout: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const host = canvas.getByTestId('host');
    const card = canvas.getByTestId('card');
    await expect(card).toHaveAttribute('data-scope', 'card');
    await expect(card).toHaveAttribute('data-surface', '+1');
    await expect(getComputedStyle(card).backgroundColor).not.toBe(getComputedStyle(host).backgroundColor);
    await expect(getComputedStyle(card).borderTopStyle).toBe('solid');

    const title = canvas.getByRole('heading', { name: 'Roadmap' }).getBoundingClientRect();
    const description = canvas.getByText('What ships next quarter and why.').getBoundingClientRect();
    const footer = canvas.getByTestId('footer').getBoundingClientRect();
    await expect(description.left).toBeCloseTo(title.left, 0);
    await expect(footer.left).toBeCloseTo(title.left, 0);
    // The trailing action's block-sized cell ends where the footer's last action does.
    const more = canvas.getByRole('button', { name: 'More actions' }).getBoundingClientRect();
    const review = canvas.getByRole('button', { name: 'Review' }).getBoundingClientRect();
    await expect(more.right + 2).toBeCloseTo(review.right, 0);
    // The content edge is inset from the card's own edge by the gutter.
    await expect(title.left - card.getBoundingClientRect().left).toBeGreaterThan(8);
  },
};

/** The poster spans the card's full width at its aspect ratio, flush with the top edge. */
export const Poster: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const card = canvas.getByTestId('poster-card');
    const poster = canvas.getByTestId('poster');
    await waitFor(() => expect(poster).toHaveAttribute('data-status', 'loaded'));
    const cardBox = card.getBoundingClientRect();
    const posterBox = poster.getBoundingClientRect();
    const border = parseFloat(getComputedStyle(card).borderLeftWidth);
    await expect(posterBox.width).toBeCloseTo(cardBox.width - 2 * border, 0);
    await expect(posterBox.top).toBeCloseTo(cardBox.top + border, 0);
    await expect(posterBox.width / posterBox.height).toBeCloseTo(16 / 9, 1);
    await expect(parseFloat(getComputedStyle(poster).borderTopLeftRadius)).toBeGreaterThan(0);
    const title = canvas.getByRole('heading', { name: 'Launch' }).getBoundingClientRect();
    await expect(title.top).toBeGreaterThanOrEqual(posterBox.bottom - 0.5);
  },
};

/** A poster that fails to load keeps its frame and shows the broken-image icon. */
export const BrokenPoster: Story = {
  args: { poster: 'data:image/png;base64,AAAA' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const poster = canvas.getByTestId('poster');
    await waitFor(() => expect(poster).toHaveAttribute('data-status', 'error'));
    await expect(within(poster).getByRole('img', { name: 'Launch artwork' }).tagName.toLowerCase()).toBe('svg');
    const box = poster.getBoundingClientRect();
    await expect(box.width / box.height).toBeCloseTo(16 / 9, 1);
  },
};

/** A trailing IconButton in `Card.Header` shows its label in a Tooltip. */
export const HeaderTooltip: Story = {
  play: async ({ canvasElement }) => {
    const more = within(canvasElement).getByRole('button', { name: 'More actions' });
    await userEvent.hover(more);
    await expectTooltip(more, 'More actions');
  },
};
