//
// Copyright 2025 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React from 'react';
import { afterEach, describe, test } from 'vitest';

import { type MenuActions, type MenuItem, type MenuItemsAccessor } from '../types.ts';
import { createMenuAction } from '../util.ts';
import { makeMenuActions, useMenuContribution, useMenuItems } from './useMenuActions.ts';

const createMenu = (baseItems: MenuItem[] = []): MenuActions => {
  const baseItemsAtom = Atom.make<MenuItem[] | null>(baseItems);
  const items: MenuItemsAccessor = () => baseItemsAtom;
  return makeMenuActions({ items });
};

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

const Consumer = ({ menu }: { menu: MenuActions }) => {
  const items = useMenuItems(menu);
  return (
    <div data-testid='menu-items'>
      {items?.map((item, index) => (
        <div key={item.id} data-testid={`item-${index}`} data-item-id={item.id}>
          {(item.properties as { label?: string })?.label}
        </div>
      ))}
    </div>
  );
};

describe('useMenuContribution', () => {
  afterEach(() => {
    cleanup();
  });

  test('contributes items to a menu', ({ expect }) => {
    const menu = createMenu();
    render(
      <>
        <Contributor
          menu={menu}
          id='test'
          items={[createMenuAction('test-1', () => {}, { label: 'Test Action 1', icon: 'ph--star--regular' })]}
        />
        <Consumer menu={menu} />
      </>,
    );

    expect(screen.getByText('Test Action 1')).toBeTruthy();
  });

  test('combines base items with contributions', ({ expect }) => {
    const menu = createMenu([
      createMenuAction('base-1', () => {}, { label: 'Base Action', icon: 'ph--star--regular' }),
    ]);
    render(
      <>
        <Contributor
          menu={menu}
          id='test'
          items={[createMenuAction('contrib-1', () => {}, { label: 'Contributed Action', icon: 'ph--star--regular' })]}
        />
        <Consumer menu={menu} />
      </>,
    );

    expect(screen.getByTestId('menu-items').children.length).toBe(2);
    expect(screen.getByText('Base Action')).toBeTruthy();
    expect(screen.getByText('Contributed Action')).toBeTruthy();
  });

  test('orders contributions by priority', ({ expect }) => {
    const menu = createMenu();
    render(
      <>
        <Contributor
          menu={menu}
          id='low'
          items={[createMenuAction('low', () => {}, { label: 'Low', icon: 'ph--star--regular' })]}
          priority={200}
        />
        <Contributor
          menu={menu}
          id='high'
          items={[createMenuAction('high', () => {}, { label: 'High', icon: 'ph--star--regular' })]}
          priority={50}
        />
        <Consumer menu={menu} />
      </>,
    );

    expect(screen.getByTestId('item-0').getAttribute('data-item-id')).toBe('high');
    expect(screen.getByTestId('item-1').getAttribute('data-item-id')).toBe('low');
  });

  test('replacement mode overrides all items', ({ expect }) => {
    const menu = createMenu([
      createMenuAction('base-1', () => {}, { label: 'Base Action', icon: 'ph--star--regular' }),
    ]);
    render(
      <>
        <Contributor
          menu={menu}
          id='additive'
          items={[createMenuAction('add-1', () => {}, { label: 'Added', icon: 'ph--star--regular' })]}
        />
        <Contributor
          menu={menu}
          id='replacement'
          mode='replacement'
          items={[
            createMenuAction('replacement-1', () => {}, { label: 'Replacement Only', icon: 'ph--star--regular' }),
          ]}
        />
        <Consumer menu={menu} />
      </>,
    );

    expect(screen.getByTestId('menu-items').children.length).toBe(1);
    expect(screen.getByText('Replacement Only')).toBeTruthy();
  });

  test('removes the contribution when the contributor unmounts', ({ expect }) => {
    const menu = createMenu([
      createMenuAction('base-1', () => {}, { label: 'Base Action', icon: 'ph--star--regular' }),
    ]);
    const { rerender } = render(
      <>
        <Contributor
          menu={menu}
          id='test'
          items={[createMenuAction('contrib-1', () => {}, { label: 'Contributed Action', icon: 'ph--star--regular' })]}
        />
        <Consumer menu={menu} />
      </>,
    );
    expect(screen.getByTestId('menu-items').children.length).toBe(2);

    rerender(<Consumer menu={menu} />);
    expect(screen.getByTestId('menu-items').children.length).toBe(1);
    expect(screen.queryByText('Contributed Action')).toBeNull();
  });
});
