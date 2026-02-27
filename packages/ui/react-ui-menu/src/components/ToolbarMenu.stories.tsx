//
// Copyright 2024 DXOS.org
//

import { Atom, RegistryContext } from '@effect-atom/atom-react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useContext, useEffect, useMemo, useState } from 'react';

import { faker } from '@dxos/random';
import { Button, IconButton } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { MenuProvider, DropdownMenu as NaturalDropdownMenu, ToolbarMenu, useMenuContribution } from '../components';
import { type ActionGraphProps, useMenuActions } from '../hooks';
import { createActions, createNestedActions, createNestedActionsResolver, useMutateActions } from '../testing';
import { translations } from '../translations';
import { type MenuItem } from '../types';
import { createMenuAction } from '../util';

faker.seed(1234);

const meta = {
  title: 'ui/react-ui-menu/ToolbarMenu',
  component: ToolbarMenu,
  decorators: [withTheme, withRegistry],
  parameters: {
    translations,
  },
} satisfies Meta<typeof ToolbarMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const DropdownMenu: Story = {
  render: () => {
    const actionsAtom = useMemo(() => {
      const actions = createActions();
      return Atom.make<ActionGraphProps>({
        nodes: actions,
        edges: actions.map((action) => ({ source: 'root', target: action.id })),
      }).pipe(Atom.keepAlive);
    }, []);
    useMutateActions(actionsAtom);
    const menu = useMenuActions(actionsAtom);

    return (
      <MenuProvider {...menu}>
        <NaturalDropdownMenu.Root>
          <NaturalDropdownMenu.Trigger asChild>
            <IconButton icon='ph--list-checks--regular' label='Options' />
          </NaturalDropdownMenu.Trigger>
        </NaturalDropdownMenu.Root>
      </MenuProvider>
    );
  },
};

export const Toolbar: Story = {
  render: () => {
    const nestedMenuActions = useMemo(() => createNestedActionsResolver(), []);

    return (
      <MenuProvider {...nestedMenuActions}>
        <ToolbarMenu />
      </MenuProvider>
    );
  },
};

export const UseMenuActionsToolbar: Story = {
  render: () => {
    useMutateActions(createNestedActions);
    const menu = useMenuActions(createNestedActions);

    return (
      <MenuProvider {...menu}>
        <ToolbarMenu />
      </MenuProvider>
    );
  },
};

//
// Menu Contribution Stories.
//

/**
 * Component that contributes static menu items.
 */
const StaticContributor = () => {
  const items: MenuItem[] = useMemo(
    () => [
      createMenuAction('contributed-1', () => alert('Contributed action 1'), {
        label: 'Contributed Action 1',
        icon: 'ph--star--regular',
      }),
      createMenuAction('contributed-2', () => alert('Contributed action 2'), {
        label: 'Contributed Action 2',
        icon: 'ph--heart--regular',
      }),
    ],
    [],
  );

  useMenuContribution({
    id: 'static-contributor',
    mode: 'additive',
    items,
  });

  return null;
};

export const StaticContribution: Story = {
  render: () => {
    const actionsAtom = useMemo(() => {
      const actions = createActions({ count: 3 });
      return Atom.make<ActionGraphProps>({
        nodes: actions,
        edges: actions.map((action) => ({ source: 'root', target: action.id })),
      }).pipe(Atom.keepAlive);
    }, []);
    const menu = useMenuActions(actionsAtom);

    return (
      <MenuProvider {...menu}>
        <StaticContributor />
        <NaturalDropdownMenu.Root>
          <NaturalDropdownMenu.Trigger asChild>
            <IconButton icon='ph--list-checks--regular' label='Options' />
          </NaturalDropdownMenu.Trigger>
        </NaturalDropdownMenu.Root>
      </MenuProvider>
    );
  },
};

/**
 * Component that contributes reactive menu items via an atom.
 */
const ReactiveContributor = ({ itemsAtom }: { itemsAtom: Atom.Atom<MenuItem[]> }) => {
  useMenuContribution({
    id: 'reactive-contributor',
    mode: 'additive',
    items: itemsAtom,
    priority: 50, // Higher priority (lower number) = appears first in contributions.
  });

  return null;
};

export const ReactiveContribution: Story = {
  render: () => {
    const baseActionsAtom = useMemo(() => {
      const actions = createActions({ count: 2 });
      return Atom.make<ActionGraphProps>({
        nodes: actions,
        edges: actions.map((action) => ({ source: 'root', target: action.id })),
      }).pipe(Atom.keepAlive);
    }, []);

    const contributedItemsAtom = useMemo(
      () =>
        Atom.make<MenuItem[]>([
          createMenuAction('reactive-1', () => alert('Reactive action'), {
            label: 'Reactive Action',
            icon: 'ph--lightning--regular',
          }),
        ]).pipe(Atom.keepAlive),
      [],
    );

    const registry = useContext(RegistryContext);
    const [count, setCount] = useState(1);

    useEffect(() => {
      registry.set(contributedItemsAtom, [
        createMenuAction('reactive-1', () => alert(`Reactive action (count: ${count})`), {
          label: `Reactive Action (${count})`,
          icon: 'ph--lightning--regular',
        }),
      ]);
    }, [count, contributedItemsAtom, registry]);

    const menu = useMenuActions(baseActionsAtom);

    return (
      <div className='flex flex-col gap-4'>
        <MenuProvider {...menu}>
          <ReactiveContributor itemsAtom={contributedItemsAtom} />
          <NaturalDropdownMenu.Root>
            <NaturalDropdownMenu.Trigger asChild>
              <IconButton icon='ph--list-checks--regular' label='Options' />
            </NaturalDropdownMenu.Trigger>
          </NaturalDropdownMenu.Root>
        </MenuProvider>
        <Button onClick={() => setCount((c) => c + 1)}>Update Reactive Item ({count})</Button>
      </div>
    );
  },
};

/**
 * Component that replaces all menu items.
 */
const ReplacementContributor = () => {
  const items: MenuItem[] = useMemo(
    () => [
      createMenuAction('replacement-1', () => alert('Replacement only'), {
        label: 'Replacement Only',
        icon: 'ph--swap--regular',
      }),
    ],
    [],
  );

  useMenuContribution({
    id: 'replacement-contributor',
    mode: 'replacement',
    items,
  });

  return null;
};

export const ReplacementMode: Story = {
  render: () => {
    const actionsAtom = useMemo(() => {
      const actions = createActions({ count: 5 });
      return Atom.make<ActionGraphProps>({
        nodes: actions,
        edges: actions.map((action) => ({ source: 'root', target: action.id })),
      }).pipe(Atom.keepAlive);
    }, []);
    const menu = useMenuActions(actionsAtom);

    return (
      <MenuProvider {...menu}>
        <ReplacementContributor />
        <NaturalDropdownMenu.Root>
          <NaturalDropdownMenu.Trigger asChild>
            <IconButton icon='ph--list-checks--regular' label='Options (replaced)' />
          </NaturalDropdownMenu.Trigger>
        </NaturalDropdownMenu.Root>
      </MenuProvider>
    );
  },
};

/**
 * Demo of multiple contributors with different priorities.
 */
const LowPriorityContributor = () => {
  const items: MenuItem[] = useMemo(
    () => [
      createMenuAction('low-priority', () => alert('Low priority'), {
        label: 'Low Priority (150)',
        icon: 'ph--arrow-down--regular',
      }),
    ],
    [],
  );

  useMenuContribution({
    id: 'low-priority-contributor',
    mode: 'additive',
    items,
    priority: 150,
  });

  return null;
};

const HighPriorityContributor = () => {
  const items: MenuItem[] = useMemo(
    () => [
      createMenuAction('high-priority', () => alert('High priority'), {
        label: 'High Priority (50)',
        icon: 'ph--arrow-up--regular',
      }),
    ],
    [],
  );

  useMenuContribution({
    id: 'high-priority-contributor',
    mode: 'additive',
    items,
    priority: 50,
  });

  return null;
};

export const PriorityOrdering: Story = {
  render: () => {
    const actionsAtom = useMemo(() => {
      const actions = createActions({ count: 2 });
      return Atom.make<ActionGraphProps>({
        nodes: actions,
        edges: actions.map((action) => ({ source: 'root', target: action.id })),
      }).pipe(Atom.keepAlive);
    }, []);
    const menu = useMenuActions(actionsAtom);

    return (
      <MenuProvider {...menu}>
        {/* Note: Order in JSX doesn't matter - priority determines order. */}
        <LowPriorityContributor />
        <HighPriorityContributor />
        <NaturalDropdownMenu.Root>
          <NaturalDropdownMenu.Trigger asChild>
            <IconButton icon='ph--list-checks--regular' label='Options (priority ordered)' />
          </NaturalDropdownMenu.Trigger>
        </NaturalDropdownMenu.Root>
      </MenuProvider>
    );
  },
};
