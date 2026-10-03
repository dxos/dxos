//
// Copyright 2026 DXOS.org
//

import '../../theme/index.css';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { translations } from '#translations';

import { withLayout, withTheme } from '../../../testing/index.ts';
import { type Size, SIZES } from '../../sizes.ts';
import { GEOMETRY, byTestId, centreX, controlSize, expectTooltip, sizeRow } from '../../testing.ts';
import { SIZE_ARG_TYPES, type SizeArgs, withSizes } from '../../testing/stories.tsx';
import { Avatar, Block, Button, Card, Container, DragHandle, Icon, Menu, Switch, Tag, Typography } from '../index.ts';
import { type CardRootProps } from './Card.tsx';

/** Inline SVG, so the story never fetches from the network. */
const POSTER = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 320 180'>
    <defs><linearGradient id='g' x2='1' y2='1'><stop offset='0' stop-color='#f472b6'/><stop offset='1' stop-color='#6366f1'/></linearGradient></defs>
    <rect width='320' height='180' fill='url(#g)'/><circle cx='80' cy='60' r='28' fill='#fef3c7'/>
  </svg>`,
)}`;

/** A malformed data URI fails to decode without any network request. */
const BROKEN = 'data:image/png;base64,AAAA';

type RowsCardProps = {
  size: Size;
  /** Places icons and trailing actions in the card's rails; without it they sit inline in each row. */
  grid?: CardRootProps['grid'];
  /** Keeps the test ids and accessible names of the inline copy distinct. */
  prefix?: string;
  rows: number;
  onInvite: () => void;
};

/** A card of sections, rows, a link, a menu and a drag handle, in either placement of its leading and trailing cells. */
const RowsCard = ({ size, grid, prefix = '', rows, onInvite }: RowsCardProps) => {
  const name = prefix ? 'Inline ' : '';
  return (
    <Card.Root grid={grid} data-testid={`${prefix}rows-card-${size}`}>
      <Card.Header>
        <DragHandle label={`${name}Drag`} data-testid={`${prefix}drag-${size}`} />
        <Card.Title>{name}Project</Card.Title>
        <Card.Menu label={`${name}Project actions`}>
          <Menu.Item item={{ value: 'archive', label: 'Archive' }} />
        </Card.Menu>
      </Card.Header>
      <Card.Section title={`${name}Members`} data-testid={`${prefix}section-${size}`}>
        <Card.Row
          icon='ph--user--regular'
          trailing={<Tag hue='emerald'>Owner</Tag>}
          data-testid={`${prefix}row-${size}`}
        >
          Ada Lovelace
        </Card.Row>
        <Card.Row
          icon='ph--user--regular'
          trailing={<Card.Action icon='ph--x--regular' label={`${name}Remove`} />}
          data-testid={`${prefix}long-row-${size}`}
        >
          Charles Babbage, Lucasian Professor of Mathematics at Cambridge
        </Card.Row>
        <Card.Row icon='ph--plus--regular' onClick={onInvite} data-testid={`${prefix}add-row-${size}`}>
          {name}Invite ({rows})
        </Card.Row>
      </Card.Section>
      <Card.Section>
        <Card.Link label={`${name}Project site`} href='https://dxos.org' data-testid={`${prefix}link-${size}`} />
        <Card.Text variant='description' data-testid={`${prefix}text-${size}`}>
          Updated today.
        </Card.Text>
      </Card.Section>
    </Card.Root>
  );
};

/**
 * A poster card, a card with a header action and footer, and one with a broken poster; then a card of sections, rows,
 * a link, a menu and a drag handle, as a `grid` card and beside it as a default (inline) one; a clickable, selected card with
 * a nested action; and a borderless card.
 */
const DefaultStory = ({ size = 'md' }: SizeArgs) => {
  const [opened, setOpened] = useState(0);
  const [starred, setStarred] = useState(0);
  const [rows, setRows] = useState(0);
  return (
    <div className='grid grid-cols-3 items-start gap-4 py-4'>
      <Card.Root data-testid={`poster-card-${size}`}>
        <Card.Poster src={POSTER} alt='Launch artwork' data-testid={`poster-${size}`} />
        <Card.Header>
          <Card.Title>Launch</Card.Title>
        </Card.Header>
        <Card.Body>
          <Card.Description>The first public release, with sharing and sync.</Card.Description>
        </Card.Body>
        <Card.Footer>
          <Button variant='primary'>Open</Button>
        </Card.Footer>
      </Card.Root>

      <Card.Root data-testid={`card-${size}`}>
        <Card.Header>
          <Card.Title>Roadmap</Card.Title>
          <Button icon='ph--dots-three--regular' label='More actions' iconOnly />
        </Card.Header>
        <Card.Body>
          <Card.Description>What ships next quarter and why.</Card.Description>
          <Typography>Three milestones, each with an owner and a date.</Typography>
        </Card.Body>
        <Card.Footer data-testid={`footer-${size}`}>
          <Button>Dismiss</Button>
          <Button variant='primary'>Review</Button>
        </Card.Footer>
      </Card.Root>

      <Card.Root>
        <Card.Poster src={BROKEN} alt='Missing artwork' data-testid={`broken-${size}`} />
        <Card.Header>
          <Card.Title>Notes</Card.Title>
          <Block>
            <Icon icon='ph--note--regular' />
          </Block>
        </Card.Header>
        <Card.Body>
          <Typography>A card with a broken poster and no footer.</Typography>
        </Card.Body>
      </Card.Root>

      <RowsCard size={size} grid rows={rows} onInvite={() => setRows((count) => count + 1)} />
      <RowsCard size={size} prefix='inline-' rows={rows} onInvite={() => setRows((count) => count + 1)} />

      <Card.Root selected onClick={() => setOpened((count) => count + 1)} data-testid={`clickable-${size}`}>
        <Card.Header>
          <Card.Title>Opened {opened}</Card.Title>
          <Card.Action
            icon='ph--star--regular'
            label='Star'
            onClick={() => setStarred((count) => count + 1)}
            data-testid={`star-${size}`}
          />
        </Card.Header>
        <Card.Body>
          <Card.Text data-testid={`starred-${size}`}>Starred {starred}</Card.Text>
        </Card.Body>
      </Card.Root>

      <Card.Root border={false} data-testid={`borderless-${size}`}>
        <Card.Header>
          <Card.Title>Borderless</Card.Title>
          <Card.Action system='delete' data-testid={`delete-${size}`} />
          <Card.Action system='close' data-testid={`close-${size}`} />
        </Card.Header>
      </Card.Root>
    </div>
  );
};

/**
 * A rail card's geometry: its inner edges (inside the border and the inline padding), the centres of its block-wide
 * start and end rails, and its content edge.
 */
const rails = (card: HTMLElement, size: Size) => {
  const rect = card.getBoundingClientRect();
  const style = getComputedStyle(card);
  const inner = parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
  const { block } = GEOMETRY[size];
  return {
    padding: parseFloat(style.paddingLeft),
    innerStart: rect.left + inner,
    innerEnd: rect.right - inner,
    start: rect.left + inner + block / 2,
    end: rect.right - inner - block / 2,
    contentStart: rect.left + inner + block,
  };
};

const meta = {
  title: 'ui/react-ui-core/components/Card',
  render: DefaultStory,
  decorators: [withSizes(), withLayout({ classNames: 'p-0 w-[52rem]' }), withTheme()],
  args: { size: 'md' },
  argTypes: SIZE_ARG_TYPES,
  parameters: { layout: 'centered', translations },
} satisfies Meta<SizeArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** `size` scopes a card's own metrics: its blocks and controls take that size whatever the host's. */
export const Sized: Story = {
  render: () => (
    <Card.Root size='sm' data-testid='sized-card'>
      <Card.Header>
        <Block data-testid='sized-block'>
          <Icon icon='ph--cube--regular' />
        </Block>
        <Card.Title>Small card</Card.Title>
      </Card.Header>
    </Card.Root>
  ),
  play: async ({ canvasElement }) => {
    // A header Block is one control at the card's size.
    await expect(byTestId(canvasElement, 'sized-block').getBoundingClientRect().height).toBeCloseTo(
      controlSize('sm'),
      0,
    );
  },
};

const TILES = [
  { icon: 'ph--kanban--regular', hue: 'indigo', title: 'Kanban', text: 'Boards of cards in columns.' },
  {
    icon: 'ph--table--regular',
    hue: 'green',
    title: 'Sheet',
    text: 'Spreadsheets with formulas, ranges and charts, shared live with everyone in the space, and a much longer description that clamps to three lines however wide the card is.',
  },
  { icon: 'ph--compass--regular', hue: 'amber', title: 'Explorer', text: 'Browse the graph.' },
] as const;

const TileGridStory = () => {
  const [opened, setOpened] = useState('');
  return (
    <Container gutter='md' padBlock data-testid='tile-root'>
      <Container
        layout='row'
        columns='repeat(auto-fill, minmax(14rem, 1fr))'
        gap='lg'
        align='stretch'
        data-testid='tile-grid'
      >
        {TILES.map(({ icon, hue, title, text }) => (
          <Card.Root key={title} data-testid={`tile-card-${title}`}>
            <Card.Tile icon={icon} hue={hue} onClick={() => setOpened(title)} data-testid={`tile-${title}`} />
            <Card.Body>
              <Card.Header>
                <Card.Title truncate>{title}</Card.Title>
              </Card.Header>
              <Typography tone='description' lines={3}>
                {text}
              </Typography>
              <Card.Footer justify='between' data-testid={`tile-footer-${title}`}>
                <Tag hue='purple'>labs</Tag>
                <Switch aria-label={title} />
              </Card.Footer>
            </Card.Body>
          </Card.Root>
        ))}
      </Container>
      <Typography data-testid='tile-opened'>{opened}</Typography>
    </Container>
  );
};

/**
 * A responsive grid of tile cards: a `row` Container whose columns auto-fill, `align='stretch'` so a row's cards share
 * the tallest's height, and `padBlock` on the template root so the grid starts a gutter below its top edge.
 */
export const TileGrid: Story = {
  render: () => <TileGridStory />,
  play: async ({ canvasElement }) => {
    const card = byTestId(canvasElement, 'tile-card-Kanban').getBoundingClientRect();
    const tile = byTestId(canvasElement, 'tile-Kanban');
    const tileRect = tile.getBoundingClientRect();
    // The tile fills the card's start edge and full height, inside its border.
    await expect(tileRect.left - card.left).toBeCloseTo(1, 0);
    await expect(tileRect.height).toBeCloseTo(card.height - 2, 0);
    await expect(getComputedStyle(tile).backgroundColor).not.toBe(
      getComputedStyle(byTestId(canvasElement, 'tile-card-Kanban')).backgroundColor,
    );
    // Cards of a row stretch to the tallest, and each footer ends at its card's bottom.
    const sheet = byTestId(canvasElement, 'tile-card-Sheet').getBoundingClientRect();
    await expect(sheet.height).toBeCloseTo(card.height, 0);
    const footer = byTestId(canvasElement, 'tile-footer-Kanban').getBoundingClientRect();
    await expect(card.bottom - footer.bottom).toBeLessThan(12);
    // `padBlock` starts the grid a gutter below the root's edge.
    const root = byTestId(canvasElement, 'tile-root').getBoundingClientRect();
    await expect(card.top - root.top).toBeGreaterThan(0);
    await userEvent.click(tile);
    await waitFor(() => expect(byTestId(canvasElement, 'tile-opened')).toHaveTextContent('Kanban'));
  },
};

/** A Row's `leading` content (here an avatar) takes the icon's Block in the start rail. */
export const LeadingRow: Story = {
  render: () => (
    <Card.Root grid>
      <Card.Row
        leading={<Avatar.Root fallback='Ada Lovelace' label='Ada Lovelace' data-testid='leading-avatar' />}
        trailing={<Icon icon='ph--arrow-right--regular' />}
        onClick={() => {}}
      >
        <Card.Text>Ada Lovelace</Card.Text>
      </Card.Row>
      <Card.Row icon='ph--calendar--regular'>
        <Card.Text>Standup</Card.Text>
      </Card.Row>
    </Card.Root>
  ),
  play: async ({ canvasElement }) => {
    const avatar = byTestId(canvasElement, 'leading-avatar');
    const icon = canvasElement.querySelectorAll('[data-part="row"]')[1]?.querySelector('svg');
    // Both sit in the start rail's Block, so the row texts start at the same edge.
    await expect(avatar.closest('[data-part="row"] > *')).not.toBeNull();
    await expect(centreX(avatar.getBoundingClientRect())).toBeCloseTo(
      icon ? centreX(icon.getBoundingClientRect()) : 0,
      0,
    );
  },
};

/**
 * The card lifts one level above its host, and title, body and footer share the content edge; the poster spans the
 * card's full width at its aspect ratio, flush with the top edge, and a poster that fails to load keeps its frame and
 * shows the broken-image icon; a trailing icon-only Button in `Card.Header` shows its label in a Tooltip (left open).
 * A Section is a `group` named by its caption; Rows are block-tall, their icons in the start rail and trailing actions
 * and tags ending in the end rail, like the Header's drag handle and menu, with text at the content edge, truncating;
 * that is a `grid` card, whose rails sit one gap inside the border; a default card creates no grid and keeps icons and
 * actions inline in the content box;
 * a Row or Card with `onClick` is a button (Enter and Space), and a nested Action or Menu never activates it. A Link
 * opens in a new tab; a DragHandle is outside the tab order; `selected` and `border={false}` restyle the frame.
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
    // A default card is no grid: the header's trailing action ends where the footer's last action does.
    await expect(getComputedStyle(card).display).not.toBe('grid');
    await expect(card).not.toHaveAttribute('data-gutter');
    const more = canvas.getByRole('button', { name: 'More actions' }).getBoundingClientRect();
    const review = canvas.getByRole('button', { name: 'Review' }).getBoundingClientRect();
    await expect(more.right + GEOMETRY.md.inset).toBeCloseTo(review.right, 0);
    // The content edge is inset from the card's own edge by its padding.
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
    await expect(rowText('row-md')?.getBoundingClientRect().left).toBeCloseTo(
      caption?.getBoundingClientRect().left ?? 0,
      0,
    );
    const addRow = canvas.getByRole('button', { name: /^Invite/ });
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

    // System actions take the SystemButton preset's icon and translated label.
    await expect(canvas.getByTestId('close-md')).toHaveAccessibleName('Close');
    await expect(canvas.getByTestId('delete-md')).toHaveAccessibleName('Delete');

    // Grid: leading and trailing cells sit in the card's rails at every size, the rails one gap inside the
    // border; text starts at the content edge.
    for (const size of SIZES) {
      const rowsCard = byTestId(canvasElement, `rows-card-${size}`);
      await expect(rowsCard).toHaveAttribute('data-gutter', 'rail');
      await expect(getComputedStyle(rowsCard).display).toBe('grid');
      const { padding, innerStart, innerEnd, start, end, contentStart } = rails(rowsCard, size);
      const border = rowsCard.getBoundingClientRect();
      const at = (testId: string, selector: string) =>
        byTestId(rowsCard, testId).querySelector<HTMLElement>(selector)?.getBoundingClientRect() ?? new DOMRect();
      await expect(padding, `${size} card padding`).toBeGreaterThanOrEqual(4);
      await expect(
        at('row-' + size, '[data-rail="start"] svg').left - border.left,
        `${size} icon inset`,
      ).toBeGreaterThan(padding);
      await expect(innerStart).toBeLessThan(start);
      await expect(innerEnd).toBeGreaterThan(end);
      await expect(centreX(at('row-' + size, '[data-rail="start"] svg')), `${size} row icon`).toBeCloseTo(start, 0);
      await expect(centreX(at('link-' + size, '[data-rail="start"] svg')), `${size} link icon`).toBeCloseTo(start, 0);
      await expect(centreX(byTestId(rowsCard, `drag-${size}`).getBoundingClientRect()), `${size} drag`).toBeCloseTo(
        start,
        0,
      );
      const menu = within(rowsCard).getByRole('button', { name: 'Project actions' }).getBoundingClientRect();
      await expect(centreX(menu), `${size} menu`).toBeCloseTo(end, 0);
      const remove = within(rowsCard).getByRole('button', { name: 'Remove' }).getBoundingClientRect();
      await expect(centreX(remove), `${size} remove`).toBeCloseTo(end, 0);
      const tag = at('row-' + size, '[data-scope="tag"]');
      await expect(tag.right, `${size} tag end`).toBeCloseTo(remove.right, 0);
      const title = within(rowsCard).getByRole('heading', { name: 'Project' }).getBoundingClientRect();
      await expect(title.left, `${size} title`).toBeCloseTo(contentStart, 0);
      await expect(at('row-' + size, '[data-part="row-content"]').left, `${size} row text`).toBeCloseTo(
        contentStart,
        0,
      );
      const caption = at('section-' + size, '[data-part="section-title"]');
      await expect(caption.left, `${size} caption`).toBeCloseTo(contentStart, 0);
      await expect(border.right - remove.right, `${size} action inset`).toBeGreaterThan(padding);
    }

    // Default (no grid): no grid on the root or its rows; the drag handle, icons and trailing actions stay inside the
    // content box, which the caption and icon cells start at, and icon rows' text aligns.
    for (const size of SIZES) {
      const inline = byTestId(canvasElement, `inline-rows-card-${size}`);
      await expect(inline).not.toHaveAttribute('data-gutter');
      await expect(getComputedStyle(inline).display, `${size} root`).not.toBe('grid');
      for (const part of inline.querySelectorAll<HTMLElement>(
        '[data-part="row"], [data-part="link"], [data-part="section"]',
      )) {
        await expect(getComputedStyle(part).display, `${size} ${part.dataset.part}`).not.toBe('grid');
      }
      const rect = inline.getBoundingClientRect();
      const at = (testId: string, selector: string) =>
        byTestId(inline, testId).querySelector<HTMLElement>(selector)?.getBoundingClientRect() ?? new DOMRect();
      const contentStart = at(`inline-section-${size}`, '[data-part="section-title"]').left;
      const contentEnd = rect.right - (contentStart - rect.left);
      await expect(contentStart - rect.left, `${size} inline gutter`).toBeGreaterThan(8);
      // The drag handle leads the title inside the content column.
      const drag = byTestId(inline, `inline-drag-${size}`).getBoundingClientRect();
      const title = within(inline).getByRole('heading', { name: 'Inline Project' }).getBoundingClientRect();
      await expect(drag.left, `${size} inline drag`).toBeGreaterThanOrEqual(contentStart - 0.5);
      await expect(title.left).toBeGreaterThanOrEqual(drag.right);
      const icon = at(`inline-row-${size}`, '[data-rail="start"]');
      await expect(icon.left, `${size} inline icon`).toBeCloseTo(contentStart, 0);
      const text = at(`inline-row-${size}`, '[data-part="row-content"]');
      await expect(text.left, `${size} inline text`).toBeCloseTo(icon.right, 0);
      await expect(text.left).toBeCloseTo(at(`inline-long-row-${size}`, '[data-part="row-content"]').left, 0);
      const remove = within(inline).getByRole('button', { name: 'Inline Remove' }).getBoundingClientRect();
      await expect(remove.right, `${size} inline action`).toBeLessThanOrEqual(contentEnd + 0.5);
      await expect(remove.left).toBeGreaterThan(contentStart);
      await expect(at(`inline-row-${size}`, '[data-scope="tag"]').right).toBeLessThanOrEqual(contentEnd + 0.5);
      const menu = within(inline).getByRole('button', { name: 'Inline Project actions' }).getBoundingClientRect();
      await expect(menu.right, `${size} inline menu`).toBeLessThanOrEqual(contentEnd + 0.5);
    }

    const moreButton = canvas.getByRole('button', { name: 'More actions' });
    await userEvent.hover(moreButton);
    await expectTooltip(moreButton, 'More actions');
  },
};
