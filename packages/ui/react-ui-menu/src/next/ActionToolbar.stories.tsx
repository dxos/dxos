//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { random } from '@dxos/random';
import '@dxos/react-ui/next/theme.css';
import { Next } from '@dxos/react-ui/next';
import { withRegistry, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { MenuBuilder } from '../builder.ts';
import { type ActionGraphProps, useMenuActions, useMenuBuilder } from '../hooks/index.ts';
import { createActions, createNestedActions, createNestedActionsResolver, useMutateActions } from '../testing/index.ts';
import { ActionMenu } from './ActionMenu.tsx';
import { ActionToolbar } from './ActionToolbar.tsx';

random.seed(1234);

const meta = {
  title: 'ui/react-ui-menu/next/ActionToolbar',
  decorators: [withTheme(), withRegistry],
  parameters: {
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

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
        <Next.Button icon='ph--list-checks--regular' label='Options' iconOnly />
      </ActionMenu>
    );
  },
};

export const Default: Story = {
  render: () => {
    const registry = useContext(RegistryContext);
    const menu = useMemo(() => createNestedActionsResolver({ registry }), [registry]);

    return <ActionToolbar {...menu} alwaysActive />;
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

/** `ActionToolbar` renders its own children after the graph items: here a filter input trails the actions. */
export const TrailingChildren: Story = {
  render: () => {
    const registry = useContext(RegistryContext);
    const menu = useMemo(() => createNestedActionsResolver({ registry }), [registry]);

    return (
      <ActionToolbar {...menu} alwaysActive>
        <Next.Input placeholder='Filter…' aria-label='Filter' />
      </ActionToolbar>
    );
  },
};

/** The other way round: a hand-written `Next.Toolbar.Root` with an `ActionMenu` among its own controls. */
export const EmbeddedMenu: Story = {
  render: () => {
    const registry = useContext(RegistryContext);
    const menu = useMemo(() => createNestedActionsResolver({ registry }), [registry]);

    return (
      <Next.Toolbar.Root>
        <Next.Button>Foo</Next.Button>
        <Next.Toolbar.Separator />
        <ActionMenu {...menu}>
          <Next.Button icon='ph--dots-three-vertical--regular' label='More' iconOnly />
        </ActionMenu>
      </Next.Toolbar.Root>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'More' }));
    const body = within(document.body);
    // Every root item of the nested fixture is a group, so each is a submenu trigger.
    const triggers = await body.findAllByRole('menuitem');
    await expect(triggers.length).toBeGreaterThan(0);
    await expect(triggers[0]).toHaveAttribute('aria-haspopup', 'menu');
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
      <Next.Container gap='md'>
        <ActionToolbar {...menu} alwaysActive />
        <Next.Typography data-testid='log'>{log.join(',')}</Next.Typography>
      </Next.Container>
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

/** Without `alwaysActive` a toolbar is enabled only while its attendable has attention; here nothing does. */
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
    await expect(canvas.getByRole('toolbar')).toHaveClass('document');
    await expect(canvas.getByTestId('add')).toBeDisabled();
  },
};
