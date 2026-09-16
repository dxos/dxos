//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { useMemo, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';

import { Button, IconButton } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';
import { withRegistry } from '@dxos/storybook-utils';

import { translations } from '#translations';

import { type ActionGraphProps, useMenuActions, useMenuContribution } from '../hooks/index.ts';
import { createActions } from '../testing/index.ts';
import { type MenuActions, type MenuItem } from '../types.ts';
import { createMenuAction } from '../util.ts';
import { ActionMenu } from './ActionMenu.tsx';

const meta = {
  title: 'ui/react-ui-menu/ActionMenu',
  decorators: [withTheme(), withRegistry],
  parameters: {
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj;

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

/** A contributor: registers items with a menu it does not own, for as long as it is mounted. */
const Contributor = ({
  menu,
  id,
  items,
  mode = 'additive',
  priority,
}: {
  menu: MenuActions;
  id: string;
  items: MenuItem[];
  mode?: 'additive' | 'replacement';
  priority?: number;
}) => {
  useMenuContribution(menu, { id, mode, priority, items });
  return null;
};

const staticItems: MenuItem[] = [
  createMenuAction('static-1', () => {}, { label: 'Static Action 1', icon: 'ph--star--regular' }),
  createMenuAction('static-2', () => {}, { label: 'Static Action 2', icon: 'ph--heart--regular' }),
];

export const StaticItems: Story = {
  render: () => {
    const actionsAtom = useMemo(() => createBaseActionsAtom(2), []);
    const menu = useMenuActions(actionsAtom);

    return (
      <>
        <Contributor menu={menu} id='static-items' items={staticItems} />
        <ActionMenu {...menu}>
          <IconButton icon='ph--list-checks--regular' label='Options' />
        </ActionMenu>
      </>
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

    const menu = useMenuActions(actionsAtom);

    return (
      <div className='flex flex-col gap-4'>
        <Contributor menu={menu} id='reactive-items' priority={50} items={reactiveItems} />
        <div>
          <ActionMenu {...menu}>
            <IconButton icon='ph--list-checks--regular' label='Options' />
          </ActionMenu>
        </div>
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

const replacementItems: MenuItem[] = [
  createMenuAction('replacement-1', () => {}, { label: 'Replacement Only', icon: 'ph--swap--regular' }),
];

export const ReplacementMode: Story = {
  render: () => {
    const actionsAtom = useMemo(() => createBaseActionsAtom(5), []);
    const menu = useMenuActions(actionsAtom);

    return (
      <>
        <Contributor menu={menu} id='replacement-items' mode='replacement' items={replacementItems} />
        <ActionMenu {...menu}>
          <IconButton icon='ph--list-checks--regular' label='Options (replaced)' />
        </ActionMenu>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const body = await openDropdown(canvasElement);
    const items = await body.findAllByRole('menuitem');
    await expect(items).toHaveLength(1);
    await expect(items[0].textContent).toBe('Replacement Only');
  },
};

const lowPriorityItems: MenuItem[] = [
  createMenuAction('low-priority', () => {}, { label: 'Low Priority (150)', icon: 'ph--arrow-down--regular' }),
];

const highPriorityItems: MenuItem[] = [
  createMenuAction('high-priority', () => {}, { label: 'High Priority (50)', icon: 'ph--arrow-up--regular' }),
];

export const PriorityOrdering: Story = {
  render: () => {
    // A menu with no items of its own, filled entirely by contributions (the card-menu shape).
    const menu = useMenuActions();

    return (
      <>
        <Contributor menu={menu} id='low-priority-items' priority={150} items={lowPriorityItems} />
        <Contributor menu={menu} id='high-priority-items' priority={50} items={highPriorityItems} />
        <ActionMenu {...menu}>
          <IconButton icon='ph--list-checks--regular' label='Options (priority ordered)' />
        </ActionMenu>
      </>
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
