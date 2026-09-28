//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { type SizeArgs, withSizes } from '../../stories.tsx';
import { expectTooltip, sizeRow } from '../../testing.ts';

/** Inline SVG, so the story never fetches from the network. */
const POSTER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'>
    <defs><linearGradient id='g' x2='1' y2='1'><stop offset='0' stop-color='#f472b6'/><stop offset='1' stop-color='#6366f1'/></linearGradient></defs>
    <rect width='320' height='180' fill='url(#g)'/><circle cx='80' cy='60' r='28' fill='#fef3c7'/>
  </svg>`,
)}`;

/** A malformed data URI fails to decode without any network request. */
const BROKEN = 'data:image/png;base64,AAAA';

const DefaultStory = ({ size }: SizeArgs) => (
  <div className='grid grid-cols-3 items-start gap-4 py-4'>
    <Next.Card.Root data-testid={`poster-card-${size}`}>
      <Next.Card.Poster src={POSTER} alt='Launch artwork' data-testid={`poster-${size}`} />
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

    <Next.Card.Root data-testid={`card-${size}`}>
      <Next.Card.Header>
        <Next.Card.Title>Roadmap</Next.Card.Title>
        <Next.Button icon='ph--dots-three--regular' label='More actions' iconOnly />
      </Next.Card.Header>
      <Next.Card.Body>
        <Next.Card.Description>What ships next quarter and why.</Next.Card.Description>
        <Next.Typography>Three milestones, each with an owner and a date.</Next.Typography>
      </Next.Card.Body>
      <Next.Card.Footer data-testid={`footer-${size}`}>
        <Next.Button>Dismiss</Next.Button>
        <Next.Button variant='primary'>Review</Next.Button>
      </Next.Card.Footer>
    </Next.Card.Root>

    <Next.Card.Root>
      <Next.Card.Poster src={BROKEN} alt='Missing artwork' data-testid={`broken-${size}`} />
      <Next.Card.Header>
        <Next.Card.Title>Notes</Next.Card.Title>
        <Next.Block>
          <Next.Icon icon='ph--note--regular' />
        </Next.Block>
      </Next.Card.Header>
      <Next.Card.Body>
        <Next.Typography>A card with a broken poster and no footer.</Next.Typography>
      </Next.Card.Body>
    </Next.Card.Root>
  </div>
);

const meta = {
  title: 'ui/react-ui-core/next/components/card',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[52rem]' }), withTheme()],
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The card lifts one level above its host, and title, body and footer share the content edge; the poster spans the
 * card's full width at its aspect ratio, flush with the top edge, and a poster that fails to load keeps its frame and
 * shows the broken-image icon; a trailing icon-only Button in `Card.Header` shows its label in a Tooltip (left open).
 */
export const Test: Story = {
  play: async ({ canvasElement }) => {
    const row = sizeRow(canvasElement, 'md');
    const canvas = within(row);
    const card = canvas.getByTestId('card-md');
    await expect(card).toHaveAttribute('data-scope', 'card');
    await expect(card).toHaveAttribute('data-surface', '+1');
    await expect(getComputedStyle(card).backgroundColor).not.toBe(getComputedStyle(row).backgroundColor);
    await expect(getComputedStyle(card).borderTopStyle).toBe('solid');

    const title = canvas.getByRole('heading', { name: 'Roadmap' }).getBoundingClientRect();
    const description = canvas.getByText('What ships next quarter and why.').getBoundingClientRect();
    const footer = canvas.getByTestId('footer-md').getBoundingClientRect();
    await expect(description.left).toBeCloseTo(title.left, 0);
    await expect(footer.left).toBeCloseTo(title.left, 0);
    // The trailing action's block-sized cell ends where the footer's last action does.
    const more = canvas.getByRole('button', { name: 'More actions' }).getBoundingClientRect();
    const review = canvas.getByRole('button', { name: 'Review' }).getBoundingClientRect();
    await expect(more.right + 2).toBeCloseTo(review.right, 0);
    // The content edge is inset from the card's own edge by the gutter.
    await expect(title.left - card.getBoundingClientRect().left).toBeGreaterThan(8);

    const posterCard = canvas.getByTestId('poster-card-md');
    const poster = canvas.getByTestId('poster-md');
    await waitFor(() => expect(poster).toHaveAttribute('data-status', 'loaded'));
    const cardBox = posterCard.getBoundingClientRect();
    const posterBox = poster.getBoundingClientRect();
    const border = parseFloat(getComputedStyle(posterCard).borderLeftWidth);
    await expect(posterBox.width).toBeCloseTo(cardBox.width - 2 * border, 0);
    await expect(posterBox.top).toBeCloseTo(cardBox.top + border, 0);
    await expect(posterBox.width / posterBox.height).toBeCloseTo(16 / 9, 1);
    await expect(parseFloat(getComputedStyle(poster).borderTopLeftRadius)).toBeGreaterThan(0);
    const launch = canvas.getByRole('heading', { name: 'Launch' }).getBoundingClientRect();
    await expect(launch.top).toBeGreaterThanOrEqual(posterBox.bottom - 0.5);

    const broken = canvas.getByTestId('broken-md');
    await waitFor(() => expect(broken).toHaveAttribute('data-status', 'error'));
    await expect(within(broken).getByRole('img', { name: 'Missing artwork' }).tagName.toLowerCase()).toBe('svg');
    const brokenBox = broken.getBoundingClientRect();
    await expect(brokenBox.width / brokenBox.height).toBeCloseTo(16 / 9, 1);

    const moreButton = canvas.getByRole('button', { name: 'More actions' });
    await userEvent.hover(moreButton);
    await expectTooltip(moreButton, 'More actions');
  },
};
