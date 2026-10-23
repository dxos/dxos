//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import '@dxos/react-ui/theme.css';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import { withRegistry, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import { type ToolbarPlacement, type ToolbarZone } from '@dxos/ui-types';

import { translationKey, translations } from '#translations';

import { MenuBuilder, TOOLBAR_OVERFLOW_ID } from '../builder.ts';
import { type ActionGraphProps, useMenuBuilder, useMenuItems } from '../hooks/index.ts';
import { type MenuActions, type MenuItem, type MenuItemGroup, isMenuGroup, isSeparator } from '../types.ts';
import { ActionMenu } from './ActionMenu.tsx';
import { MenuToolbarItem } from './ActionToolbar.tsx';

//
// Prototype: toolbars and menus share one model, built with `MenuBuilder`.
// - The owner declares named groups; a plain group (no `variant`) renders inline as a cluster of controls.
// - Other components extend a named group with `MenuBuilder.extend(groupId, …)`, ordered by `placement.order`.
// - Every toolbar ends with an overflow menu (⋮), itself a named group (`TOOLBAR_OVERFLOW_ID`) others extend.
// - When a row is too narrow, groups move into the overflow menu by `placement.collapse` rank, as submenus.
//

const ZONES: readonly ToolbarZone[] = ['start', 'middle', 'end'];

const placementOf = (item: MenuItem): ToolbarPlacement => (isSeparator(item) ? {} : (item.properties.placement ?? {}));

const isPlainGroup = (item: MenuItem): item is MenuItemGroup => isMenuGroup(item) && !item.properties.variant;

/** Sorts by `placement.order`, keeping insertion order for items without one. */
const byOrder = (items: readonly MenuItem[]): MenuItem[] =>
  items
    .map((item, index) => ({ item, order: placementOf(item).order ?? index }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);

/** A named group laid out inline: its own and contributed items, in order. */
const InlineGroup = ({ menu, group }: { menu: MenuActions; group: MenuItemGroup }) => {
  const items = useMenuItems(menu, group);
  const ordered = useMemo(() => byOrder(items ?? []), [items]);
  return (
    <div role='group' aria-label={group.id} data-group={group.id} className='flex items-center'>
      {ordered.map((item) => (
        <MenuToolbarItem key={item.id} menu={menu} item={item} />
      ))}
    </div>
  );
};

const ToolbarUnit = ({ menu, item }: { menu: MenuActions; item: MenuItem }) =>
  isPlainGroup(item) ? <InlineGroup menu={menu} group={item} /> : <MenuToolbarItem menu={menu} item={item} />;

/** The ⋮ menu: groups collapsed from the rows (as submenus), then the overflow group's own and contributed items. */
const OverflowMenu = ({
  menu,
  group,
  collapsed,
}: {
  menu: MenuActions;
  group?: MenuItemGroup;
  collapsed: MenuItem[];
}) => {
  const { t } = Hooks.useTranslation(translationKey);
  const items = useMenuItems(menu, group);
  const actions = useMemo(() => [...collapsed, ...byOrder(items ?? [])], [collapsed, items]);
  return (
    <ActionMenu {...menu} actions={actions} disabled={actions.length === 0}>
      <Button.Root
        data-testid='toolbar.overflow'
        icon='ph--dots-three-vertical--regular'
        iconOnly
        variant='ghost'
        label={t('toolbar-overflow.menu')}
        disabled={actions.length === 0}
      />
    </ActionMenu>
  );
};

type ToolbarLayoutProps = {
  menu: MenuActions;
  /** Testing hook: the ids of the groups currently moved into the overflow menu. */
  onOverflowChange?: (ids: string[]) => void;
};

/**
 * One `Toolbar.Root` per row, each laid out as start | gap | middle | gap | end, with the overflow menu (⋮) at the far
 * right of the first row. Groups move into the overflow menu by collapse rank while a row is too narrow.
 */
const ToolbarLayout = ({ menu, onOverflowChange }: ToolbarLayoutProps) => {
  const items = useMenuItems(menu);
  const overflow = items?.find((item): item is MenuItemGroup => isMenuGroup(item) && item.id === TOOLBAR_OVERFLOW_ID);
  const units = useMemo(
    () => (items ?? []).filter((item) => !isSeparator(item) && item.id !== TOOLBAR_OVERFLOW_ID),
    [items],
  );

  // Collapse order: highest rank first, later units first among equals.
  const collapsible = useMemo(
    () =>
      units
        .map((item, index) => ({ item, rank: placementOf(item).collapse, index }))
        .filter(({ rank }) => rank !== undefined)
        .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0) || b.index - a.index)
        .map(({ item }) => item),
    [units],
  );

  const rootRef = useRef<HTMLDivElement>(null);
  const [collapsedCount, setCollapsedCount] = useState(0);
  // The width at which each collapse happened: a group comes back once the toolbar is wider than that again.
  const thresholds = useRef<number[]>([]);
  const [, setWidth] = useState(0);

  useLayoutEffect(() => {
    const rows = rootRef.current?.querySelectorAll<HTMLElement>('[data-row]') ?? [];
    const overflowing = [...rows].some((row) => row.scrollWidth > row.clientWidth + 1);
    const width = rootRef.current?.clientWidth ?? 0;
    if (overflowing && collapsedCount < collapsible.length) {
      thresholds.current[collapsedCount] = width;
      setCollapsedCount(collapsedCount + 1);
    } else if (!overflowing && collapsedCount > 0 && width > (thresholds.current[collapsedCount - 1] ?? Infinity)) {
      setCollapsedCount(collapsedCount - 1);
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

  const collapsed = useMemo(() => collapsible.slice(0, collapsedCount), [collapsible, collapsedCount]);
  useLayoutEffect(() => onOverflowChange?.(collapsed.map((item) => item.id)), [collapsed, onOverflowChange]);

  const rowCount = Math.max(1, ...units.map((item) => (placementOf(item).row ?? 0) + 1));
  const zone = (row: number, zone: ToolbarZone) =>
    byOrder(
      units.filter((item) => {
        const placement = placementOf(item);
        return (placement.row ?? 0) === row && (placement.zone ?? 'start') === zone && !collapsed.includes(item);
      }),
    ).flatMap((item, index) => [
      ...(index > 0 ? [<Toolbar.Separator key={`${item.id}-separator`} variant='line' />] : []),
      <ToolbarUnit key={item.id} menu={menu} item={item} />,
    ]);

  return (
    <div ref={rootRef} className='flex flex-col min-w-0'>
      {Array.from({ length: rowCount }, (_, row) => (
        <Toolbar.Root key={row} data-row={row}>
          {ZONES.flatMap((name, index) => [
            ...(index > 0 ? [<Toolbar.Separator key={`${name}-gap`} variant='gap' />] : []),
            ...zone(row, name),
          ])}
          {row === 0 && <OverflowMenu menu={menu} group={overflow} collapsed={collapsed} />}
        </Toolbar.Root>
      ))}
    </div>
  );
};

//
// Story fixtures: an owner's toolbar (a document editor) and the components that extend it.
//

type Log = (id: string) => void;

/** The owner declares named groups and the overflow menu; it knows nothing of its contributors. */
const ownerGraph = (log: Log): ActionGraphProps =>
  MenuBuilder.make()
    .group(
      'formatting',
      { label: 'Formatting', icon: 'ph--text-aa--regular', placement: { zone: 'start', collapse: 2 } },
      (group) =>
        group
          .action('heading', { label: 'Heading', icon: 'ph--text-h--regular', placement: { order: 10 } }, () =>
            log('heading'),
          )
          .action('bold', { label: 'Bold', icon: 'ph--text-b--regular', placement: { order: 20 } }, () => log('bold'))
          .action('italic', { label: 'Italic', icon: 'ph--text-italic--regular', placement: { order: 30 } }, () =>
            log('italic'),
          )
          .action('link', { label: 'Link', icon: 'ph--link--regular', placement: { order: 40 } }, () => log('link')),
    )
    .group(
      'blocks',
      { label: 'Blocks', icon: 'ph--list-bullets--regular', placement: { zone: 'start', collapse: 3 } },
      (group) =>
        group
          .action('list', { label: 'List', icon: 'ph--list-bullets--regular', placement: { order: 10 } }, () =>
            log('list'),
          )
          .action('quote', { label: 'Quote', icon: 'ph--quotes--regular', placement: { order: 20 } }, () =>
            log('quote'),
          ),
    )
    .group('view', { label: 'View', icon: 'ph--eye--regular', placement: { zone: 'middle', collapse: 1 } }, (group) =>
      group.action('preview', { label: 'Preview', icon: 'ph--eye--regular' }, () => log('preview')),
    )
    .group('tools', { label: 'Tools', icon: 'ph--wrench--regular', placement: { zone: 'end' } }, (group) =>
      group.action('search', { label: 'Search', icon: 'ph--magnifying-glass--regular', placement: { order: 10 } }, () =>
        log('search'),
      ),
    )
    .menu(TOOLBAR_OVERFLOW_ID, (group) =>
      group.action('export', { label: 'Export', icon: 'ph--export--regular' }, () => log('export')),
    )
    .build();

type Contributor = 'review' | 'transcription' | 'presenter';

/** What other components add: each extends a named group, or adds its own group with a placement. */
const contributions: Record<Contributor, (log: Log) => ActionGraphProps[]> = {
  // Beside the formatting it relates to (after Link).
  review: (log) => [
    MenuBuilder.extend('formatting', (group) =>
      group.action(
        'comment',
        { label: 'Comment', icon: 'ph--chat-text--regular', testId: 'toolbar.comment', placement: { order: 45 } },
        () => log('comment'),
      ),
    ),
  ],
  // Ahead of Search in the owner's tools group.
  transcription: (log) => [
    MenuBuilder.extend('tools', (group) =>
      group.action(
        'microphone',
        { label: 'Dictate', icon: 'ph--microphone--regular', testId: 'toolbar.microphone', placement: { order: 5 } },
        () => log('microphone'),
      ),
    ),
  ],
  // Editing actions join the blocks group; slide-level controls take a second row; Print joins the overflow menu.
  presenter: (log) => [
    MenuBuilder.extend('blocks', (group) =>
      group
        .action(
          'column',
          {
            label: 'Start next column',
            icon: 'ph--columns--regular',
            testId: 'toolbar.column',
            placement: { order: 30 },
          },
          () => log('column'),
        )
        .action(
          'object',
          {
            label: 'Insert object',
            icon: 'ph--squares-four--regular',
            testId: 'toolbar.object',
            placement: { order: 40 },
          },
          () => log('object'),
        ),
    ),
    MenuBuilder.make()
      .group(
        'slide',
        { label: 'Slide', icon: 'ph--presentation--regular', placement: { row: 1, zone: 'start', collapse: 4 } },
        (group) =>
          group
            .action('layout', { label: 'Layout', icon: 'ph--layout--regular' }, () => log('layout'))
            .action('background', { label: 'Background', icon: 'ph--image--regular' }, () => log('background')),
      )
      .group(
        'deck',
        { label: 'Deck', icon: 'ph--projector-screen--regular', placement: { row: 1, zone: 'end' } },
        (group) => group.action('present', { label: 'Present', icon: 'ph--play--regular' }, () => log('present')),
      )
      .build(),
    MenuBuilder.extend(TOOLBAR_OVERFLOW_ID, (group) =>
      group.action('print', { label: 'Print', icon: 'ph--printer--regular' }, () => log('print')),
    ),
  ],
};

type StoryProps = { contributors?: Contributor[]; width?: number; asMenu?: boolean };

const DefaultStory = ({ contributors = [], width, asMenu }: StoryProps) => {
  const [log, setLog] = useState<string[]>([]);
  const [overflow, setOverflow] = useState<string[]>([]);
  const record = useCallback((id: string) => setLog((log) => [...log, id]), []);
  const menu = useMenuBuilder(
    () =>
      contributors
        .flatMap((contributor) => contributions[contributor](record))
        .reduce((builder, graph) => builder.subgraph(graph), MenuBuilder.make().subgraph(ownerGraph(record)))
        .build(),
    [record, contributors],
  );

  return (
    <div className='flex flex-col gap-4 p-4'>
      {asMenu ? (
        // The same graph as a menu: named groups become submenus, the overflow group one more.
        <ActionMenu {...menu}>
          <Button.Root data-testid='menu.trigger' icon='ph--list--regular' label='Menu' />
        </ActionMenu>
      ) : (
        // Drag the corner to narrow the toolbar; groups move into ⋮ by collapse rank and come back as it widens.
        <div
          data-testid='toolbar.frame'
          className='resize-x overflow-hidden border border-separator rounded-sm min-w-[8rem]'
          style={{ width: width ?? 720 }}
        >
          <ToolbarLayout menu={menu} onOverflowChange={setOverflow} />
        </div>
      )}
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

const groupIds = (canvasElement: HTMLElement) =>
  [...canvasElement.querySelectorAll<HTMLElement>('[data-group]')].map((element) => element.dataset.group);

const groupItems = (canvasElement: HTMLElement, group: string) =>
  [...canvasElement.querySelectorAll<HTMLElement>(`[data-group="${group}"] button`)].map((element) =>
    element.getAttribute('aria-label'),
  );

/** The owner's named groups across the start, middle and end zones, with Export in the overflow menu. */
export const Groups: Story = {
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(groupIds(canvasElement)).toEqual(['formatting', 'blocks', 'view', 'tools']));
    await userEvent.click(within(canvasElement).getByTestId('toolbar.overflow'));
    await expect(await within(document.body).findByRole('menuitem', { name: 'Export' })).toBeVisible();
  },
};

/** Other components extend the owner's named groups, interleaved by order, and its overflow menu. */
export const Extended: Story = {
  args: { contributors: ['review', 'transcription', 'presenter'] },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(groupItems(canvasElement, 'formatting')).toEqual(['Heading', 'Bold', 'Italic', 'Link', 'Comment']),
    );
    await expect(groupItems(canvasElement, 'tools')).toEqual(['Dictate', 'Search']);
    await expect(canvasElement.querySelectorAll('[data-row]')).toHaveLength(2);
    await userEvent.click(within(canvasElement).getByTestId('toolbar.overflow'));
    await expect(await within(document.body).findByRole('menuitem', { name: 'Print' })).toBeVisible();
  },
};

/** At a narrow width whole groups move into ⋮ by collapse rank, each as a submenu; unranked groups stay. */
export const Narrow: Story = {
  args: { contributors: ['review', 'transcription', 'presenter'], width: 320 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('toolbar.overflow-ids').textContent).toContain('blocks'));
    await expect(canvas.getByTestId('toolbar.microphone')).toBeVisible();
    await userEvent.click(canvas.getByTestId('toolbar.overflow'));
    const body = within(document.body);
    await userEvent.click(await body.findByRole('menuitem', { name: 'Blocks' }));
    await expect(await body.findByRole('menuitem', { name: 'Insert object' })).toBeVisible();
  },
};

/** The same graph rendered as a menu: named groups are submenus. */
export const AsMenu: Story = {
  args: { contributors: ['review'], asMenu: true },
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTestId('menu.trigger'));
    const body = within(document.body);
    await userEvent.click(await body.findByRole('menuitem', { name: 'Formatting' }));
    await expect(await body.findByRole('menuitem', { name: 'Comment' })).toBeVisible();
  },
};
