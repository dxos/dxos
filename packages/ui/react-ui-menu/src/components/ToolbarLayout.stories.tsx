//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import * as Button from '@dxos/react-ui/Button';
import { withRegistry, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { type MenuActionProperties } from '@dxos/ui-types';

import { translations } from '#translations';

import { MenuBuilder } from '../builder.ts';
import { type ActionGraphProps, useMenuBuilder, useMenuItems } from '../hooks/index.ts';
import { type MenuActions, type MenuItem, isSeparator } from '../types.ts';
import { ActionMenu } from './ActionMenu.tsx';
import { MenuToolbarItem } from './ActionToolbar.tsx';

//
// Prototype: where a toolbar item goes. Items carry a `placement` beside their chrome; the layout reads it.
// If the design holds, `placement` becomes a typed field of `MenuItemChrome` (ui-types).
//

type Zone = 'start' | 'middle' | 'end';

type Placement = {
  /** Left, centre or right of its row. */
  zone: Zone;
  /** Row of a multi-row toolbar (0 is the first). */
  row?: number;
  /** Order within the zone; contributors interleave with the owner's items by it. */
  order?: number;
  /** Collapses into the overflow menu when the row is too narrow; higher ranks go first, none never collapses. */
  collapse?: number;
  /** Always in the overflow menu (the toolbar's extensible menu). */
  menu?: boolean;
};

const ZONES: readonly Zone[] = ['start', 'middle', 'end'];

/** Chrome with a placement, passed to the builder as-is (the extra field travels with the item's properties). */
const placed = (
  properties: MenuActionProperties,
  placement: Placement,
): MenuActionProperties & { placement: Placement } => ({ ...properties, placement });

const isZone = (value: unknown): value is Zone => ZONES.some((zone) => zone === value);

const placementOf = (item: MenuItem): Placement => {
  const value: unknown = item.properties && Reflect.get(item.properties, 'placement');
  if (typeof value !== 'object' || value === null) {
    return { zone: 'start' };
  }
  const number = (key: string) => {
    const field: unknown = Reflect.get(value, key);
    return typeof field === 'number' ? field : undefined;
  };
  const zone: unknown = Reflect.get(value, 'zone');
  return {
    zone: isZone(zone) ? zone : 'start',
    row: number('row'),
    order: number('order'),
    collapse: number('collapse'),
    menu: Reflect.get(value, 'menu') === true,
  };
};

//
// ToolbarLayout (prototype)
//

type ToolbarLayoutProps = {
  menu: MenuActions;
  /** Testing hook: the ids currently moved into the overflow menu. */
  onOverflowChange?: (ids: string[]) => void;
};

/**
 * One `Toolbar.Root` per row, each laid out as start | gap | middle | gap | end, with the overflow menu (⋮) at the far
 * right of the first row. Items move into the overflow menu by collapse rank while a row is too narrow.
 */
const ToolbarLayout = ({ menu, onOverflowChange }: ToolbarLayoutProps) => {
  const items = useMenuItems(menu);
  const entries = useMemo(
    () =>
      (items ?? [])
        .filter((item) => !isSeparator(item))
        .map((item, index) => ({ item, placement: placementOf(item), index })),
    [items],
  );

  // Collapse order: highest rank first, later items first among equals.
  const collapsible = useMemo(
    () =>
      entries
        .filter(({ placement }) => placement.collapse !== undefined && !placement.menu)
        .sort((a, b) => (b.placement.collapse ?? 0) - (a.placement.collapse ?? 0) || b.index - a.index)
        .map(({ item }) => item.id),
    [entries],
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(0);
  // The width at which each collapse happened: an item comes back once the toolbar is wider than that again.
  const thresholds = useRef<number[]>([]);
  const [, setWidth] = useState(0);

  useLayoutEffect(() => {
    const rows = rootRef.current?.querySelectorAll<HTMLElement>('.dx-toolbar') ?? [];
    const overflowing = [...rows].some((row) => row.scrollWidth > row.clientWidth + 1);
    const width = rootRef.current?.clientWidth ?? 0;
    if (overflowing && collapsed < collapsible.length) {
      thresholds.current[collapsed] = width;
      setCollapsed(collapsed + 1);
    } else if (!overflowing && collapsed > 0 && width > (thresholds.current[collapsed - 1] ?? Infinity)) {
      setCollapsed(collapsed - 1);
    }
  });

  useLayoutEffect(() => {
    const element = rootRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const overflowIds = useMemo(() => new Set(collapsible.slice(0, collapsed)), [collapsible, collapsed]);
  useLayoutEffect(() => onOverflowChange?.([...overflowIds]), [overflowIds, onOverflowChange]);

  const rowCount = Math.max(1, ...entries.map(({ placement }) => (placement.row ?? 0) + 1));
  const inMenu = entries.filter(({ item, placement }) => placement.menu || overflowIds.has(item.id));
  const zone = (row: number, zone: Zone) =>
    entries
      .filter(
        ({ item, placement }) =>
          (placement.row ?? 0) === row && placement.zone === zone && !placement.menu && !overflowIds.has(item.id),
      )
      .sort((a, b) => (a.placement.order ?? a.index) - (b.placement.order ?? b.index))
      .map(({ item }) => <MenuToolbarItem key={item.id} menu={menu} item={item} />);

  return (
    <div ref={rootRef} className='flex flex-col min-w-0'>
      {Array.from({ length: rowCount }, (_, row) => (
        <Toolbar.Root key={row} data-row={row}>
          {zone(row, 'start')}
          <Toolbar.Separator variant='gap' />
          {zone(row, 'middle')}
          <Toolbar.Separator variant='gap' />
          {zone(row, 'end')}
          {row === 0 && inMenu.length > 0 && (
            <ActionMenu {...menu} actions={inMenu.map(({ item }) => item)}>
              <Button.Root
                data-testid='toolbar.overflow'
                icon='ph--dots-three-vertical--regular'
                iconOnly
                variant='ghost'
                label='More'
              />
            </ActionMenu>
          )}
        </Toolbar.Root>
      ))}
    </div>
  );
};

//
// Story fixtures: an owner's toolbar (a document editor) and contributions from other components.
//

/** The owner's items: formatting at the start, the view switch in the middle, search at the end, export in the menu. */
const ownerItems = (log: (id: string) => void): ActionGraphProps =>
  MenuBuilder.make()
    .action('heading', placed({ label: 'Heading', icon: 'ph--text-h--regular' }, { zone: 'start', order: 10 }), () =>
      log('heading'),
    )
    .action(
      'bold',
      placed({ label: 'Bold', icon: 'ph--text-b--regular' }, { zone: 'start', order: 20, collapse: 1 }),
      () => log('bold'),
    )
    .action(
      'italic',
      placed({ label: 'Italic', icon: 'ph--text-italic--regular' }, { zone: 'start', order: 30, collapse: 1 }),
      () => log('italic'),
    )
    .action(
      'link',
      placed({ label: 'Link', icon: 'ph--link--regular' }, { zone: 'start', order: 40, collapse: 2 }),
      () => log('link'),
    )
    .action(
      'list',
      placed({ label: 'List', icon: 'ph--list-bullets--regular' }, { zone: 'start', order: 50, collapse: 3 }),
      () => log('list'),
    )
    .action(
      'quote',
      placed({ label: 'Quote', icon: 'ph--quotes--regular' }, { zone: 'start', order: 60, collapse: 4 }),
      () => log('quote'),
    )
    .action('view', placed({ label: 'Preview', icon: 'ph--eye--regular' }, { zone: 'middle', collapse: 2 }), () =>
      log('view'),
    )
    .action(
      'search',
      placed({ label: 'Search', icon: 'ph--magnifying-glass--regular' }, { zone: 'end', collapse: 1 }),
      () => log('search'),
    )
    .action('export', placed({ label: 'Export', icon: 'ph--export--regular' }, { zone: 'end', menu: true }), () =>
      log('export'),
    )
    .build();

type Contributor = 'review' | 'transcription' | 'presenter';

/** What other components add, each declaring where its items go. */
const contributions: Record<Contributor, (log: (id: string) => void) => ActionGraphProps> = {
  // Beside the formatting it relates to.
  review: (log) =>
    MenuBuilder.make()
      .action(
        'comment',
        placed(
          { label: 'Comment', icon: 'ph--chat-text--regular', testId: 'toolbar.comment' },
          { zone: 'start', order: 45, collapse: 3 },
        ),
        () => log('comment'),
      )
      .build(),
  // A primary affordance at the end that never collapses.
  transcription: (log) =>
    MenuBuilder.make()
      .action(
        'microphone',
        placed(
          { label: 'Dictate', icon: 'ph--microphone--regular', testId: 'toolbar.microphone' },
          { zone: 'end', order: -1 },
        ),
        () => log('microphone'),
      )
      .build(),
  // Editing actions join the formatting group; slide-level controls take a second row.
  presenter: (log) =>
    MenuBuilder.make()
      .action(
        'column',
        placed(
          { label: 'Start next column', icon: 'ph--columns--regular', testId: 'toolbar.column' },
          { zone: 'start', order: 70, collapse: 5 },
        ),
        () => log('column'),
      )
      .action(
        'object',
        placed(
          { label: 'Insert object', icon: 'ph--squares-four--regular', testId: 'toolbar.object' },
          { zone: 'start', order: 75, collapse: 5 },
        ),
        () => log('object'),
      )
      .action('layout', placed({ label: 'Layout', icon: 'ph--layout--regular' }, { zone: 'start', row: 1 }), () =>
        log('layout'),
      )
      .action(
        'background',
        placed({ label: 'Background', icon: 'ph--image--regular' }, { zone: 'start', row: 1, collapse: 6 }),
        () => log('background'),
      )
      .action('present', placed({ label: 'Present', icon: 'ph--presentation--regular' }, { zone: 'end', row: 1 }), () =>
        log('present'),
      )
      .action('print', placed({ label: 'Print', icon: 'ph--printer--regular' }, { zone: 'end', menu: true }), () =>
        log('print'),
      )
      .build(),
};

type StoryProps = { contributors?: Contributor[]; width?: number };

const DefaultStory = ({ contributors = [], width }: StoryProps) => {
  const [log, setLog] = useState<string[]>([]);
  const [overflow, setOverflow] = useState<string[]>([]);
  const record = useCallback((id: string) => setLog((log) => [...log, id]), []);
  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .subgraph(ownerItems(record))
        .subgraph(
          contributors.reduce<ActionGraphProps | false>((graph, contributor) => {
            const next = contributions[contributor](record);
            return graph ? { nodes: [...graph.nodes, ...next.nodes], edges: [...graph.edges, ...next.edges] } : next;
          }, false),
        )
        .build(),
    [record, contributors],
  );

  return (
    <div className='flex flex-col gap-4 p-4'>
      {/* Drag the corner to narrow the toolbar; items move into ⋮ by collapse rank and come back as it widens. */}
      <div
        data-testid='toolbar.frame'
        className='resize-x overflow-hidden border border-separator rounded-sm min-w-[8rem]'
        style={{ width: width ?? 720 }}
      >
        <ToolbarLayout menu={menu} onOverflowChange={setOverflow} />
      </div>
      <pre className='text-xs text-description' data-testid='toolbar.overflow-ids'>
        overflow: {overflow.join(', ') || '—'}
        {'\n'}log: {log.join(', ') || '—'}
      </pre>
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-menu/ToolbarLayout (prototype)',
  render: DefaultStory,
  decorators: [withTheme(), withRegistry],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** The owner's toolbar alone: start, middle and end zones, with Export in the overflow menu. */
export const Zones: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByTestId('toolbar.overflow'));
    await expect(await within(document.body).findByRole('menuitem', { name: 'Export' })).toBeVisible();
  },
};

/** Other components add items where they declare: a comment beside formatting, a microphone at the end. */
export const Contributions: Story = {
  args: { contributors: ['review', 'transcription'] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const left = (testId: string) => canvas.getByTestId(testId).getBoundingClientRect().left;
    await expect(left('toolbar.comment')).toBeLessThan(left('toolbar.microphone'));
  },
};

/** The presenter adds editing actions to the formatting group and slide-level controls on a second row. */
export const TwoRows: Story = {
  args: { contributors: ['review', 'transcription', 'presenter'] },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(canvasElement.querySelectorAll('[data-row]')).toHaveLength(2));
  },
};

/** At a narrow width the highest-ranked items collapse into ⋮ first; never-collapsing items stay. */
export const Narrow: Story = {
  args: { contributors: ['review', 'transcription', 'presenter'], width: 320 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('toolbar.overflow-ids').textContent).toContain('object'));
    await expect(canvas.getByTestId('toolbar.microphone')).toBeVisible();
    await userEvent.click(canvas.getByTestId('toolbar.overflow'));
    await expect(await within(document.body).findByRole('menuitem', { name: 'Insert object' })).toBeVisible();
  },
};
