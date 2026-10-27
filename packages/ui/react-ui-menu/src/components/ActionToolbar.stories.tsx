//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/reactivity/Atom';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { log } from '@dxos/log';
import { random } from '@dxos/random';
import '@dxos/react-ui/theme.css';
import * as Button from '@dxos/react-ui/Button';
import * as Input from '@dxos/react-ui/Input';
import * as Layout from '@dxos/react-ui/Layout';
import { withRegistry, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Typography from '@dxos/react-ui/Typography';
import { mx } from '@dxos/ui-theme';

import { translations } from '#translations';

import { MenuBuilder, TOOLBAR_OVERFLOW_ID } from '../builder.ts';
import { type ActionGraphProps, useMenuActions, useMenuBuilder } from '../hooks/index.ts';
import { createActions, createNestedActions, createNestedActionsResolver, useMutateActions } from '../testing/index.ts';
import { ActionMenu } from './ActionMenu.tsx';
import { ActionToolbar } from './ActionToolbar.tsx';

random.seed(1234);

const meta = {
  title: 'ui/react-ui-menu/ActionToolbar',
  decorators: [withTheme(), withRegistry],
  parameters: {
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => {
    const registry = useContext(RegistryContext);
    const menu = useMemo(() => createNestedActionsResolver({ registry }), [registry]);

    return <ActionToolbar {...menu} alwaysActive />;
  },
};

export const DropdownMenu: Story = {
  render: () => {
    const actions = useMemo(() => {
      const actions = createActions();
      return Atom.make<ActionGraphProps>({
        nodes: actions,
        edges: actions.map((action) => ({ source: 'root', target: action.id, relation: 'child' })),
      }).pipe(Atom.keepAlive);
    }, []);

    useMutateActions(actions);
    const menu = useMenuActions(actions);

    return (
      <ActionMenu {...menu}>
        <Button.Root icon='ph--list-checks--regular' label='Options' iconOnly />
      </ActionMenu>
    );
  },
};

/** Reactive toolbar driven by an atom-backed actions hook; the menu structure is data, not JSX. */
export const UseMenuActionsToolbar: Story = {
  render: () => {
    useMutateActions(createNestedActions);
    const menu = useMenuActions(createNestedActions);

    return <ActionToolbar {...menu} alwaysActive />;
  },
};

/** Toolbar with both labeled and tooltip-only (iconOnly) switch items. */
export const SwitchToolbar: Story = {
  render: () => {
    const [wordWrap, setWordWrap] = useState(false);
    const [lineNumbers, setLineNumbers] = useState(true);

    const menu = useMenuBuilder(
      () =>
        MenuBuilder.make()
          .root({ label: 'Editor settings' })
          .switch('word-wrap', { label: 'Word wrap', checked: wordWrap }, () => setWordWrap((v) => !v))
          .switch('line-numbers', { label: 'Line numbers', iconOnly: true, checked: lineNumbers }, () =>
            setLineNumbers((v) => !v),
          )
          .build(),
      [wordWrap, lineNumbers],
    );

    return <ActionToolbar {...menu} alwaysActive />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const wordWrap = canvas.getByRole('switch', { name: 'Word wrap' });
    await expect(wordWrap).not.toBeChecked();
    await userEvent.click(canvas.getByText('Word wrap'));
    await waitFor(() => expect(canvas.getByRole('switch', { name: 'Word wrap' })).toBeChecked());
    await expect(canvas.getByRole('switch', { name: 'Line numbers' })).toBeChecked();

    // Switches join the toolbar's roving focus.
    canvas.getByRole('switch', { name: 'Word wrap' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('switch', { name: 'Line numbers' })).toHaveFocus();
  },
};

/**
 * Another component extends a toolbar it does not own through `customActions`: a label, its own control (`custom`), an
 * action in the owner's named group, and an item in the overflow menu.
 */
export const CustomActions: Story = {
  render: () => {
    const menu = useMenuBuilder(
      () =>
        MenuBuilder.make()
          .group('edit', { label: 'Edit' }, (group) =>
            group.action('undo', { label: 'Undo', icon: 'ph--arrow-counter-clockwise--regular' }, () => {}),
          )
          .build(),
      [],
    );
    const customActions = useMemo(
      () =>
        Atom.make(() =>
          MenuBuilder.make()
            .text('title', { label: 'Document', testId: 'title' })
            .subgraph(
              MenuBuilder.extend('edit', (group) =>
                group.action('redo', { label: 'Redo', icon: 'ph--arrow-clockwise--regular' }, () => {}),
              ),
            )
            .custom('filter', { label: 'Filter', placement: { zone: 'end' } }, () => (
              <Input.Root placeholder='Filter…' aria-label='Filter' />
            ))
            .subgraph(
              MenuBuilder.extend(TOOLBAR_OVERFLOW_ID, (group) =>
                group.action('export', { label: 'Export', icon: 'ph--export--regular' }, () => {}),
              ),
            )
            .build(),
        ),
      [],
    );

    return <ActionToolbar {...menu} customActions={customActions} alwaysActive />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('title')).toHaveTextContent('Document'));
    const buttons = [...canvas.getByRole('toolbar').querySelectorAll('button')].map((button) =>
      button.getAttribute('aria-label'),
    );
    await expect(buttons.slice(0, 2)).toEqual(['Undo', 'Redo']);
    await expect(canvas.getByRole('textbox', { name: 'Filter' })).toBeVisible();
    await userEvent.click(canvas.getByTestId('toolbar.overflow'));
    await expect(await within(document.body).findByRole('menuitem', { name: 'Export' })).toBeVisible();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(within(document.body).queryByRole('menu')).toBeNull());
  },
};

/** The other way round: a hand-written `Toolbar.Root` with an `ActionMenu` among its own controls. */
export const EmbeddedMenu: Story = {
  render: () => {
    const registry = useContext(RegistryContext);
    const menu = useMemo(() => createNestedActionsResolver({ registry }), [registry]);

    return (
      <Toolbar.Root>
        <Button.Root>Foo</Button.Root>
        <Toolbar.Separator />
        <ActionMenu {...menu}>
          <Button.Root icon='ph--dots-three-vertical--regular' label='More' iconOnly />
        </ActionMenu>
      </Toolbar.Root>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'More' }));
    const body = within(document.body);
    // Every root item of the nested fixture is a group, so each enabled one is a submenu trigger.
    const triggers = (await body.findAllByRole('menuitem')).filter(
      (trigger) => trigger.getAttribute('aria-disabled') !== 'true',
    );
    await expect(triggers.length).toBeGreaterThan(0);
    for (const trigger of triggers) {
      await expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    }
  },
};

/**
 * Every node kind the builder makes: icon buttons with a shortcut, disabled and hidden actions, a toggle, a single-select
 * toggle group, line and gap separators, a single-select (radio) and a multi-select (checkbox) dropdown, and the
 * overflow menu with a submenu.
 */
export const Builder: Story = {
  render: () => {
    const [log, setLog] = useState<string[]>([]);
    const [bold, setBold] = useState(false);
    const [view, setView] = useState('list');
    const [sort, setSort] = useState('name');
    const [columns, setColumns] = useState<string[]>(['title']);
    const record = useCallback((entry: string) => setLog((log) => [...log, entry]), []);
    const toggleColumn = useCallback(
      (column: string) =>
        setColumns((columns) =>
          columns.includes(column) ? columns.filter((value) => value !== column) : [...columns, column],
        ),
      [],
    );

    const menu = useMenuBuilder(
      () =>
        MenuBuilder.make()
          .root({ label: 'Editor' })
          .action('add', { label: 'Add', icon: 'ph--plus--regular', keyBinding: 'meta+n', testId: 'add' }, () =>
            record('add'),
          )
          .action('remove', { label: 'Remove', icon: 'ph--minus--regular', disabled: true, testId: 'remove' }, () =>
            record('remove'),
          )
          .action('secret', { label: 'Secret', icon: 'ph--eye-slash--regular', hidden: true, testId: 'secret' }, () =>
            record('secret'),
          )
          .action('sync', { label: 'Sync', icon: 'ph--arrows-clockwise--regular', spin: true, testId: 'sync' }, () =>
            record('sync'),
          )
          .separator('line')
          .action(
            'bold',
            { label: 'Bold', icon: 'ph--text-b--regular', variant: 'toggle', checked: bold, testId: 'bold' },
            () => setBold((bold) => !bold),
          )
          .group('view', { label: 'View', variant: 'toggleGroup', selectCardinality: 'single', value: view }, (group) =>
            group
              .action('list', { label: 'List', icon: 'ph--list--regular', testId: 'view-list' }, () => setView('list'))
              .action('grid', { label: 'Grid', icon: 'ph--squares-four--regular', testId: 'view-grid' }, () =>
                setView('grid'),
              ),
          )
          .separator('gap')
          .group(
            'sort',
            { label: 'Sort', icon: 'ph--sort-ascending--regular', variant: 'dropdownMenu', testId: 'sort' },
            (group) =>
              group
                .action('name', { label: 'Name', checked: sort === 'name' }, () => setSort('name'))
                .action('date', { label: 'Date', checked: sort === 'date' }, () => setSort('date')),
          )
          .group(
            'columns',
            {
              label: 'Columns',
              icon: 'ph--columns--regular',
              variant: 'dropdownMenu',
              selectCardinality: 'multiple',
              value: columns,
              testId: 'columns',
            },
            (group) =>
              group
                .action('title', { label: 'Title', checked: columns.includes('title') }, () => toggleColumn('title'))
                .action('owner', { label: 'Owner', checked: columns.includes('owner') }, () => toggleColumn('owner')),
          )
          .menu(
            'more',
            (group) =>
              group
                .action('copy', { label: 'Copy', icon: 'ph--copy--regular', keyBinding: 'meta+c' }, () =>
                  record('copy'),
                )
                .separator('line')
                .group('export', { label: 'Export', icon: 'ph--export--regular', testId: 'export' }, (sub) =>
                  sub
                    .action('pdf', { label: 'PDF' }, () => record('pdf'))
                    .action('png', { label: 'PNG' }, () => record('png')),
                )
                .group(
                  'import',
                  { label: 'Import', icon: 'ph--download-simple--regular', disabled: true, testId: 'import' },
                  (sub) => sub.action('csv', { label: 'CSV' }, () => record('csv')),
                ),
            'more',
          )
          .build(),
      [bold, view, sort, columns],
    );

    return (
      <Layout.Container gap='md'>
        <ActionToolbar {...menu} alwaysActive />
        <Typography.Text data-testid='log'>{log.join(',')}</Typography.Text>
      </Layout.Container>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);

    // Icon buttons: the label (with its shortcut) names the button; disabled and hidden actions.
    await userEvent.click(canvas.getByTestId('add'));
    await waitFor(() => expect(canvas.getByTestId('log')).toHaveTextContent('add'));
    await expect(canvas.getByTestId('add')).toHaveAccessibleName(/^Add \(.+\)$/);
    await expect(canvas.getByTestId('remove')).toBeDisabled();
    await expect(canvas.queryByTestId('secret')).toBeNull();
    await expect(canvas.getByTestId('sync').querySelector('svg')).toHaveAttribute('data-spin');

    // A `gap` separator is Next's growing spacer.
    await expect(canvas.getByRole('toolbar').querySelector('[data-part="gap"]')).not.toBeNull();

    // Toggle and toggle group.
    await expect(canvas.getByTestId('bold')).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(canvas.getByTestId('bold'));
    await waitFor(() => expect(canvas.getByTestId('bold')).toHaveAttribute('aria-pressed', 'true'));
    await userEvent.click(canvas.getByTestId('view-grid'));
    await waitFor(() => expect(canvas.getByTestId('view-grid')).toHaveAttribute('aria-checked', 'true'));
    await expect(canvas.getByTestId('view-list')).toHaveAttribute('aria-checked', 'false');

    // Single-select dropdown: radio items, closing on select.
    await userEvent.click(canvas.getByTestId('sort'));
    await expect(await body.findByRole('menuitemradio', { name: 'Name' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(body.getByRole('menuitemradio', { name: 'Date' }));
    await waitFor(() => expect(body.queryByRole('menuitemradio', { name: 'Date' })).toBeNull());
    await userEvent.click(canvas.getByTestId('sort'));
    await expect(await body.findByRole('menuitemradio', { name: 'Date' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());

    // Multi-select dropdown: checkbox items, staying open across toggles.
    await userEvent.click(canvas.getByTestId('columns'));
    await userEvent.click(await body.findByRole('menuitemcheckbox', { name: 'Owner' }));
    await waitFor(() =>
      expect(body.getByRole('menuitemcheckbox', { name: 'Owner' })).toHaveAttribute('aria-checked', 'true'),
    );
    await expect(body.getByRole('menuitemcheckbox', { name: 'Title' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());

    // Overflow menu: a shortcut on an item, and a group opening as a submenu from its TriggerItem.
    await userEvent.click(canvas.getByTestId('more'));
    const copy = await body.findByRole('menuitem', { name: /Copy/ });
    await expect(copy.querySelector('kbd')).not.toBeNull();
    const exportTrigger = body.getByTestId('export');
    await expect(exportTrigger).toHaveAttribute('aria-haspopup', 'menu');
    // A disabled group is an inert row: no submenu behind it.
    await expect(body.getByTestId('import')).toHaveAttribute('aria-disabled', 'true');
    await expect(body.getByTestId('import')).not.toHaveAttribute('aria-haspopup');
    await userEvent.click(exportTrigger);
    await userEvent.click(await body.findByRole('menuitem', { name: 'PDF' }));
    await waitFor(() => expect(canvas.getByTestId('log')).toHaveTextContent('add,pdf'));
    await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
  },
};

/**
 * Without `alwaysActive` a toolbar recedes while its attendable lacks attention (here nothing has it), as the current
 * toolbar did: its controls stay operable, so the first press on an unattended plank both attends it and acts.
 */
export const Attention: Story = {
  render: () => {
    const menu = useMenuBuilder(
      () =>
        MenuBuilder.make()
          .root({ label: 'Document' })
          .action('add', { label: 'Add', icon: 'ph--plus--regular', testId: 'add' }, () => {})
          .build(),
      [],
    );

    return <ActionToolbar {...menu} attendableId='document' />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toolbar = canvas.getByRole('toolbar');
    await expect(toolbar).toHaveClass('document');
    await expect(toolbar).toHaveAttribute('data-inactive');
    await expect(canvas.getByTestId('add')).toBeEnabled();
  },
};

//
// Layout: named groups, contributions from other components, rows and the overflow menu.
//

/** Story fixtures: an owner's toolbar (a document editor) and the components that extend it. */
type Log = (id: string) => void;

const record: Log = (id) => log.info('action', { id });

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
    .group('view', { label: 'View', icon: 'ph--eye--regular', placement: { zone: 'end', collapse: 1 } }, (group) =>
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

type StoryProps = { contributors?: Contributor[]; narrow?: boolean; asMenu?: boolean };

const LayoutStory = ({ contributors = [], narrow, asMenu }: StoryProps) => {
  const menu = useMenuBuilder(
    () =>
      contributors
        .flatMap((contributor) => contributions[contributor](record))
        .reduce((builder, graph) => builder.subgraph(graph), MenuBuilder.make().subgraph(ownerGraph(record)))
        .build(),
    [contributors],
  );

  return (
    <div className='p-8'>
      {asMenu ? (
        // The same graph as a menu: named groups become submenus, the overflow group one more.
        <ActionMenu {...menu}>
          <Button.Root data-testid='menu.trigger' icon='ph--list--regular' label='Menu' />
        </ActionMenu>
      ) : (
        // Fills the story frame; resize the window and groups move into ⋮ by collapse rank, coming back as it widens.
        <ActionToolbar {...menu} alwaysActive classNames={mx('_border border-separator', narrow && 'max-w-[20rem]')} />
      )}
    </div>
  );
};

/** The labels of a row's buttons, in DOM order. */
const labels = (canvasElement: HTMLElement, row = 0) => {
  const rows = canvasElement.querySelectorAll<HTMLElement>('[role=toolbar]');
  return [...(rows[row]?.querySelectorAll('button') ?? [])].map((button) => button.getAttribute('aria-label'));
};

/** The owner's named groups across the start and end zones, with Export in the overflow menu. */
export const Groups: Story = {
  render: () => <LayoutStory />,
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(labels(canvasElement)).toEqual([
        'Heading',
        'Bold',
        'Italic',
        'Link',
        'List',
        'Quote',
        'Preview',
        'Search',
        'More',
      ]),
    );
    await userEvent.click(within(canvasElement).getByTestId('toolbar.overflow'));
    await expect(await within(document.body).findByRole('menuitem', { name: 'Export' })).toBeVisible();
  },
};

/** Other components extend the owner's named groups (interleaved by order), add a second row, and extend ⋮. */
export const Extended: Story = {
  render: () => <LayoutStory contributors={['review', 'transcription', 'presenter']} />,
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(labels(canvasElement)).toEqual([
        'Heading',
        'Bold',
        'Italic',
        'Link',
        'Comment',
        'List',
        'Quote',
        'Start next column',
        'Insert object',
        'Preview',
        'Dictate',
        'Search',
        'More',
      ]),
    );
    await expect(labels(canvasElement, 1)).toEqual(['Layout', 'Background', 'Present']);
    await userEvent.click(within(canvasElement).getByTestId('toolbar.overflow'));
    await expect(await within(document.body).findByRole('menuitem', { name: 'Print' })).toBeVisible();
  },
};

/** At a narrow width whole groups move into ⋮ by collapse rank, each as a submenu; unranked groups stay. */
export const Narrow: Story = {
  render: () => <LayoutStory contributors={['review', 'transcription', 'presenter']} narrow />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(labels(canvasElement)).not.toContain('List'));
    await expect(canvas.getByTestId('toolbar.microphone')).toBeVisible();
    await userEvent.click(canvas.getByTestId('toolbar.overflow'));
    const body = within(document.body);
    await userEvent.click(await body.findByRole('menuitem', { name: 'Blocks' }));
    await expect(await body.findByRole('menuitem', { name: 'Insert object' })).toBeVisible();
  },
};

/** The same graph rendered as a menu: named groups are submenus. */
export const AsMenu: Story = {
  render: () => <LayoutStory contributors={['review']} asMenu />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByTestId('menu.trigger'));
    const body = within(document.body);
    await userEvent.click(await body.findByRole('menuitem', { name: 'Formatting' }));
    await expect(await body.findByRole('menuitem', { name: 'Comment' })).toBeVisible();
  },
};
