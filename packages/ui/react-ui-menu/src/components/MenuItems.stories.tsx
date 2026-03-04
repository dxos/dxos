//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Button, IconButton } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { DropdownMenu, MenuProvider, useMenu } from '../components';
import { type ActionGraphProps, useMenuActions } from '../hooks';
import { createActions } from '../testing';
import { translations } from '../translations';
import { type MenuItem } from '../types';
import { createMenuAction } from '../util';

const STORY_NAME = 'StoryMenuItems';

const meta = {
  title: 'ui/react-ui-menu/MenuItems',
  component: MenuProvider,
  decorators: [withTheme(), withRegistry],
  parameters: {
    translations,
  },
} satisfies Meta<typeof MenuProvider>;

export default meta;

type Story = StoryObj<typeof meta>;

const createBaseActionsAtom = (count = 3) => {
  const actions = createActions({ count });
  return Atom.make<ActionGraphProps>({
    nodes: actions,
    edges: actions.map((action) => ({ source: 'root', target: action.id, relation: 'child' })),
  }).pipe(Atom.keepAlive);
};

const openDropdown = async (canvasElement: HTMLElement) => {
  const canvas = within(canvasElement);
  const trigger = canvas.getByRole('button', { name: /options/i });
  await userEvent.click(trigger);
  const body = within(document.body);
  return body;
};

const StaticItemsProvider = () => {
  const menu = useMenu(STORY_NAME);
  const items: MenuItem[] = useMemo(
    () => [
      createMenuAction('static-1', () => {}, {
        label: 'Static Action 1',
        icon: 'ph--star--regular',
      }),
      createMenuAction('static-2', () => {}, {
        label: 'Static Action 2',
        icon: 'ph--heart--regular',
      }),
    ],
    [],
  );

  useEffect(() => {
    menu.addMenuItems({ id: 'static-items', mode: 'additive', items });
    return () => menu.removeMenuItems('static-items');
  }, [menu, items]);

  return null;
};

export const StaticItems: Story = {
  render: () => {
    const actionsAtom = useMemo(() => createBaseActionsAtom(2), []);
    const menuActions = useMenuActions(actionsAtom);

    return (
      <MenuProvider {...menuActions}>
        <StaticItemsProvider />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton icon='ph--list-checks--regular' label='Options' />
          </DropdownMenu.Trigger>
        </DropdownMenu.Root>
      </MenuProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const body = await openDropdown(canvasElement);
    const items = await body.findAllByRole('menuitem');
    const labels = items.map((el) => el.textContent);
    await expect(labels).toContain('Static Action 1');
    await expect(labels).toContain('Static Action 2');
  },
};

const ReactiveItemsProvider = ({ items }: { items: MenuItem[] }) => {
  const menu = useMenu(STORY_NAME);

  useEffect(() => {
    menu.addMenuItems({ id: 'reactive-items', mode: 'additive', priority: 50, items });
    return () => menu.removeMenuItems('reactive-items');
  }, [menu, items]);

  return null;
};

export const ReactiveItems: Story = {
  render: () => {
    const actionsAtom = useMemo(() => createBaseActionsAtom(2), []);
    const [count, setCount] = useState(1);
    const reactiveItems: MenuItem[] = useMemo(
      () => [
        createMenuAction('reactive-1', () => {}, {
          label: `Reactive Action (${count})`,
          icon: 'ph--lightning--regular',
        }),
      ],
      [count],
    );

    const menuActions = useMenuActions(actionsAtom);

    return (
      <div className='flex flex-col gap-4'>
        <MenuProvider {...menuActions}>
          <ReactiveItemsProvider items={reactiveItems} />
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <IconButton icon='ph--list-checks--regular' label='Options' />
            </DropdownMenu.Trigger>
          </DropdownMenu.Root>
        </MenuProvider>
        <Button data-testid='update-button' onClick={() => setCount((prev) => prev + 1)}>
          Update Reactive Item ({count})
        </Button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const body = await openDropdown(canvasElement);
    const items = await body.findAllByRole('menuitem');
    await expect(items.map((el) => el.textContent)).toContain('Reactive Action (1)');

    await userEvent.keyboard('{Escape}');
    const updateButton = canvas.getByTestId('update-button');
    await userEvent.click(updateButton);

    const body2 = await openDropdown(canvasElement);
    const updatedItems = await body2.findAllByRole('menuitem');
    await expect(updatedItems.map((el) => el.textContent)).toContain('Reactive Action (2)');
  },
};

const ReplacementItemsProvider = () => {
  const menu = useMenu(STORY_NAME);
  const items: MenuItem[] = useMemo(
    () => [
      createMenuAction('replacement-1', () => {}, {
        label: 'Replacement Only',
        icon: 'ph--swap--regular',
      }),
    ],
    [],
  );

  useEffect(() => {
    menu.addMenuItems({ id: 'replacement-items', mode: 'replacement', items });
    return () => menu.removeMenuItems('replacement-items');
  }, [menu, items]);

  return null;
};

export const ReplacementMode: Story = {
  render: () => {
    const actionsAtom = useMemo(() => createBaseActionsAtom(5), []);
    const menuActions = useMenuActions(actionsAtom);

    return (
      <MenuProvider {...menuActions}>
        <ReplacementItemsProvider />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton icon='ph--list-checks--regular' label='Options (replaced)' />
          </DropdownMenu.Trigger>
        </DropdownMenu.Root>
      </MenuProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const body = await openDropdown(canvasElement);
    const items = await body.findAllByRole('menuitem');
    await expect(items).toHaveLength(1);
    await expect(items[0].textContent).toBe('Replacement Only');
  },
};

const LowPriorityItemsProvider = () => {
  const menu = useMenu(STORY_NAME);
  const items: MenuItem[] = useMemo(
    () => [
      createMenuAction('low-priority', () => {}, {
        label: 'Low Priority (150)',
        icon: 'ph--arrow-down--regular',
      }),
    ],
    [],
  );

  useEffect(() => {
    menu.addMenuItems({ id: 'low-priority-items', mode: 'additive', items, priority: 150 });
    return () => menu.removeMenuItems('low-priority-items');
  }, [menu, items]);

  return null;
};

const HighPriorityItemsProvider = () => {
  const menu = useMenu(STORY_NAME);
  const items: MenuItem[] = useMemo(
    () => [
      createMenuAction('high-priority', () => {}, {
        label: 'High Priority (50)',
        icon: 'ph--arrow-up--regular',
      }),
    ],
    [],
  );

  useEffect(() => {
    menu.addMenuItems({ id: 'high-priority-items', mode: 'additive', items, priority: 50 });
    return () => menu.removeMenuItems('high-priority-items');
  }, [menu, items]);

  return null;
};

export const PriorityOrdering: Story = {
  render: () => {
    const actionsAtom = useMemo(() => createBaseActionsAtom(0), []);
    const menuActions = useMenuActions(actionsAtom);

    return (
      <MenuProvider {...menuActions}>
        <LowPriorityItemsProvider />
        <HighPriorityItemsProvider />
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton icon='ph--list-checks--regular' label='Options (priority ordered)' />
          </DropdownMenu.Trigger>
        </DropdownMenu.Root>
      </MenuProvider>
    );
  },
  play: async ({ canvasElement }) => {
    const body = await openDropdown(canvasElement);
    const items = await body.findAllByRole('menuitem');
    await expect(items).toHaveLength(2);
    await expect(items[0].textContent).toBe('High Priority (50)');
    await expect(items[1].textContent).toBe('Low Priority (150)');
  },
};
