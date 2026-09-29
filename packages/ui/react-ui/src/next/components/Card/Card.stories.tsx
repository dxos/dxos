//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withTheme } from '../../../testing/index.ts';
import { Next } from '../../Next.tsx';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../stories.tsx';
import { GEOMETRY, expectTooltip, sizeRow } from '../../testing.ts';

/** Inline SVG, so the story never fetches from the network. */
const POSTER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'>
    <defs><linearGradient id='g' x2='1' y2='1'><stop offset='0' stop-color='#f472b6'/><stop offset='1' stop-color='#6366f1'/></linearGradient></defs>
    <rect width='320' height='180' fill='url(#g)'/><circle cx='80' cy='60' r='28' fill='#fef3c7'/>
  </svg>`,
)}`;

/** A malformed data URI fails to decode without any network request. */
const BROKEN = 'data:image/png;base64,AAAA';

/**
 * A poster card, a card with a header action and footer, and one with a broken poster; then a card of sections, rows,
 * a link, a menu and a drag handle; a clickable, selected card with a nested action; and a borderless card.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [opened, setOpened] = useState(0);
  const [starred, setStarred] = useState(0);
  const [rows, setRows] = useState(0);
  return (
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

      <Next.Card.Root data-testid={`rows-card-${size}`}>
        <Next.Card.Header>
          <Next.Card.DragHandle label='Drag' data-testid={`drag-${size}`} />
          <Next.Card.Title>Project</Next.Card.Title>
          <Next.Card.Menu label='Project actions'>
            <Next.Menu.Item value='archive'>Archive</Next.Menu.Item>
          </Next.Card.Menu>
        </Next.Card.Header>
        <Next.Card.Section title='Members' data-testid={`section-${size}`}>
          <Next.Card.Row
            icon='ph--user--regular'
            trailing={<Next.Tag hue='emerald'>Owner</Next.Tag>}
            data-testid={`row-${size}`}
          >
            Ada Lovelace
          </Next.Card.Row>
          <Next.Card.Row
            icon='ph--user--regular'
            trailing={<Next.Card.Action icon='ph--x--regular' label='Remove' />}
            data-testid={`long-row-${size}`}
          >
            Charles Babbage, Lucasian Professor of Mathematics at Cambridge
          </Next.Card.Row>
          <Next.Card.Row
            icon='ph--plus--regular'
            onClick={() => setRows((count) => count + 1)}
            data-testid={`add-row-${size}`}
          >
            Invite ({rows})
          </Next.Card.Row>
        </Next.Card.Section>
        <Next.Card.Section>
          <Next.Card.Link label='Project site' href='https://dxos.org' data-testid={`link-${size}`} />
          <Next.Card.Text variant='description' data-testid={`text-${size}`}>
            Updated today.
          </Next.Card.Text>
        </Next.Card.Section>
      </Next.Card.Root>

      <Next.Card.Root selected onClick={() => setOpened((count) => count + 1)} data-testid={`clickable-${size}`}>
        <Next.Card.Header>
          <Next.Card.Title>Opened {opened}</Next.Card.Title>
          <Next.Card.Action
            icon='ph--star--regular'
            label='Star'
            onClick={() => setStarred((count) => count + 1)}
            data-testid={`star-${size}`}
          />
        </Next.Card.Header>
        <Next.Card.Body>
          <Next.Card.Text data-testid={`starred-${size}`}>Starred {starred}</Next.Card.Text>
        </Next.Card.Body>
      </Next.Card.Root>

      <Next.Card.Root border={false} data-testid={`borderless-${size}`}>
        <Next.Card.Header>
          <Next.Card.Title>Borderless</Next.Card.Title>
        </Next.Card.Header>
      </Next.Card.Root>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/next/components/Card',
  render: DefaultStory,
  decorators: [withSizes({ width: 'w-[52rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered' },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/**
 * The card lifts one level above its host, and title, body and footer share the content edge; the poster spans the
 * card's full width at its aspect ratio, flush with the top edge, and a poster that fails to load keeps its frame and
 * shows the broken-image icon; a trailing icon-only Button in `Card.Header` shows its label in a Tooltip (left open).
 * A Section is a `group` named by its caption; Rows are block-tall with icon texts aligned and trailing content at the
 * content edge, truncating their text; a Row or Card with `onClick` is a button (Enter and Space), and a nested Action
 * or Menu never activates it. A Link opens in a new tab; a DragHandle is outside the tab order; `selected` and
 * `border={false}` restyle the frame.
 */
export const Test: Story = {
  args: { allSizes: true },
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

    // Sections and rows.
    await expect(canvas.getByRole('group', { name: 'Members' })).toBe(canvas.getByTestId('section-md'));
    const rowBox = canvas.getByTestId('row-md').getBoundingClientRect();
    await expect(rowBox.height).toBeCloseTo(GEOMETRY.md.block, 0);
    const rowText = (testId: string) =>
      canvas.getByTestId(testId).querySelector<HTMLElement>('[data-part="row-content"]');
    await expect(rowText('row-md')?.getBoundingClientRect().left).toBeCloseTo(
      rowText('long-row-md')?.getBoundingClientRect().left ?? 0,
      0,
    );
    const long = rowText('long-row-md');
    await expect(long && long.scrollWidth > long.clientWidth).toBe(true);
    const tag = canvas.getByTestId('row-md').querySelector('[data-scope="tag"]')?.getBoundingClientRect();
    await expect(tag?.right ?? 0).toBeLessThanOrEqual(rowBox.right + 0.5);
    const caption = canvas.getByTestId('section-md').querySelector('[data-part="section-title"]');
    await expect(rowBox.left).toBeCloseTo(caption?.getBoundingClientRect().left ?? 0, 0);
    const addRow = canvas.getByRole('button', { name: /Invite/ });
    await expect(addRow).toBe(canvas.getByTestId('add-row-md'));
    addRow.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(addRow).toHaveTextContent('Invite (1)'));
    await expect(canvas.getByTestId('text-md')).toHaveAttribute('data-tone', 'description');

    // Link, drag handle, menu.
    const link = canvas.getByTestId('link-md');
    await expect(link).toHaveAttribute('href', 'https://dxos.org');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(canvas.getByTestId('drag-md').tabIndex).toBe(-1);
    await userEvent.click(canvas.getByRole('button', { name: 'Project actions' }));
    const body = within(canvasElement.ownerDocument.body);
    const menu = await body.findByRole('menu');
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Archive' }));
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());

    // A clickable card: Space activates it, its Action does not.
    const clickable = canvas.getByTestId('clickable-md');
    await expect(clickable).toHaveAttribute('role', 'button');
    await expect(clickable).toHaveAttribute('aria-current', 'true');
    await expect(getComputedStyle(clickable).borderTopColor).not.toBe(getComputedStyle(card).borderTopColor);
    clickable.focus();
    await userEvent.keyboard(' ');
    await waitFor(() => expect(clickable).toHaveTextContent('Opened 1'));
    await userEvent.click(canvas.getByTestId('star-md'));
    await waitFor(() => expect(canvas.getByTestId('starred-md')).toHaveTextContent('Starred 1'));
    await expect(clickable).toHaveTextContent('Opened 1');
    await userEvent.click(clickable);
    await waitFor(() => expect(clickable).toHaveTextContent('Opened 2'));
    await expect(getComputedStyle(canvas.getByTestId('borderless-md')).borderTopColor).toBe('rgba(0, 0, 0, 0)');

    const moreButton = canvas.getByRole('button', { name: 'More actions' });
    await userEvent.hover(moreButton);
    await expectTooltip(moreButton, 'More actions');
  },
};
