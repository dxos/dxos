//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useMemo, useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { type MenuActionEntry, type MenuEntry, type MenuGroupEntry } from '@dxos/ui-types';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Toolbar } from '../Toolbar';
import { DropdownMenu } from './index';
import { type MenuEntriesHook, MenuEntriesProvider } from './MenuEntries';

//
// Entries are plain data; this story's source is component state, resolved per group through the hook
// so that submenus and toolbar dropdowns read lazily, the way a graph-backed source would.
//

const action = (
  id: string,
  label: string,
  properties: Partial<MenuActionEntry['properties']> = {},
): MenuActionEntry => ({
  id,
  kind: 'action',
  properties: { label, ...properties },
});

const ROOT: MenuEntry[] = [
  action('new', 'New', { icon: 'ph--plus--regular', keyBinding: { macos: 'meta+n', windows: 'ctrl+n' } }),
  action('open', 'Open', { icon: 'ph--folder-open--regular' }),
  { id: 'sep-1', kind: 'separator', properties: {} },
  { id: 'share', kind: 'group', properties: { label: 'Share', icon: 'ph--share--regular' } },
  action('delete', 'Delete', { icon: 'ph--trash--regular', disabled: true }),
];

const SHARE: MenuEntry[] = [
  action('share-link', 'Copy link', { icon: 'ph--link--regular' }),
  action('share-email', 'Email', { icon: 'ph--envelope--regular' }),
];

const useDropdownStoryEntries: MenuEntriesHook = (group) => (group?.id === 'share' ? SHARE : ROOT);

const DropdownStory = () => {
  const [log, setLog] = useState<string[]>([]);
  const onAction = useCallback((entry: MenuActionEntry) => setLog((previous) => [...previous, entry.id]), []);

  return (
    <MenuEntriesProvider useEntries={useDropdownStoryEntries} onAction={onAction} caller='story'>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button>Actions</Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content>
            <DropdownMenu.Viewport>
              <DropdownMenu.Entries />
            </DropdownMenu.Viewport>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <p data-testid='log'>{log.join(',')}</p>
    </MenuEntriesProvider>
  );
};

//
// A toolbar whose value state lives in the component, projected onto entries each render.
//

const ALIGNMENTS = ['left', 'center', 'right'] as const;

const ToolbarStory = () => {
  const [alignment, setAlignment] = useState<(typeof ALIGNMENTS)[number]>('left');
  const [size, setSize] = useState('medium');
  const [wrap, setWrap] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const entries = useMemo<MenuEntry[]>(
    () => [
      action('save', 'Save', { icon: 'ph--floppy-disk--regular', variant: 'primary' }),
      { id: 'sep-1', kind: 'separator', properties: { variant: 'line' } },
      {
        id: 'alignment',
        kind: 'group',
        properties: { label: 'Alignment', variant: 'toggleGroup', selectCardinality: 'single', value: alignment },
      },
      { id: 'sep-2', kind: 'separator', properties: { variant: 'gap' } },
      {
        id: 'size',
        kind: 'group',
        properties: {
          label: 'Size',
          variant: 'dropdownMenu',
          icon: 'ph--text-aa--regular',
          selectCardinality: 'single',
          applyActive: true,
          value: size,
        },
      },
      action('wrap', 'Wrap', { variant: 'switch', checked: wrap }),
    ],
    [alignment, size, wrap],
  );

  const useEntries = useCallback<MenuEntriesHook>(
    (group?: MenuGroupEntry) => {
      switch (group?.id) {
        case 'alignment':
          return ALIGNMENTS.map((value) =>
            action(value, value, { icon: `ph--text-align-${value}--regular`, checked: alignment === value }),
          );
        case 'size':
          return ['small', 'medium', 'large'].map((value) => action(value, value, { checked: size === value }));
        default:
          return entries;
      }
    },
    [entries, alignment, size],
  );

  const onAction = useCallback((entry: MenuActionEntry, { parent }: { parent?: MenuGroupEntry }) => {
    setLog((previous) => [...previous, entry.id]);
    if (parent?.id === 'alignment') {
      setAlignment(entry.id as (typeof ALIGNMENTS)[number]);
    } else if (parent?.id === 'size') {
      setSize(entry.id);
    } else if (entry.id === 'wrap') {
      setWrap((previous) => !previous);
    }
  }, []);

  return (
    <MenuEntriesProvider useEntries={useEntries} onAction={onAction}>
      <Toolbar.Root>
        <Toolbar.Entries />
      </Toolbar.Root>
      <p data-testid='log'>{log.join(',')}</p>
    </MenuEntriesProvider>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/MenuEntries',
  decorators: [withTheme()],
  parameters: { layout: 'padded' },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Dropdown: Story = {
  render: () => <DropdownStory />,
};

export const ToolbarEntries: Story = {
  render: () => <ToolbarStory />,
};

export const TestDropdownInvokes: Story = {
  render: () => <DropdownStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'Actions' }));
    const open = await within(document.body).findByRole('menuitem', { name: /Open/ });
    await userEvent.click(open);
    await waitFor(() => expect(canvas.getByTestId('log')).toHaveTextContent('open'));
    await waitFor(() => expect(within(document.body).queryByRole('menuitem', { name: /Open/ })).toBeNull());
  },
};

export const TestToolbarToggles: Story = {
  render: () => <ToolbarStory />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('radio', { name: /center/ }));
    await waitFor(() => expect(canvas.getByRole('radio', { name: /center/ })).toHaveAttribute('aria-checked', 'true'));
    await userEvent.click(canvas.getByRole('checkbox', { name: 'Wrap' }));
    await waitFor(() => expect(canvas.getByRole('checkbox', { name: 'Wrap' })).toBeChecked());
    await waitFor(() => expect(canvas.getByTestId('log')).toHaveTextContent('center,wrap'));
  },
};
