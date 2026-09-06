//
// Copyright 2025 DXOS.org
//

import { cleanup, render, screen } from '@testing-library/react';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React from 'react';
import { afterEach, describe, test } from 'vitest';

import { type MenuActions, type MenuItem, type MenuItemsAccessor } from '../types';
import { createMenuAction } from '../util';
import { makeMenuActions, useMenuContribution, useMenuItems } from './useMenuActions';

const createTestAction = (id: string, label: string): MenuItem =>
  createMenuAction(id, () => {}, { label, icon: 'ph--star--regular' });

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
        <Contributor menu={menu} id='test' items={[createTestAction('test-1', 'Test Action 1')]} />
        <Consumer menu={menu} />
      </>,
    );

    expect(screen.getByText('Test Action 1')).toBeTruthy();
  });

  test('combines base items with contributions', ({ expect }) => {
    const menu = createMenu([createTestAction('base-1', 'Base Action')]);
    render(
      <>
        <Contributor menu={menu} id='test' items={[createTestAction('contrib-1', 'Contributed Action')]} />
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
        <Contributor menu={menu} id='low' items={[createTestAction('low', 'Low')]} priority={200} />
        <Contributor menu={menu} id='high' items={[createTestAction('high', 'High')]} priority={50} />
        <Consumer menu={menu} />
      </>,
    );

    expect(screen.getByTestId('item-0').getAttribute('data-item-id')).toBe('high');
    expect(screen.getByTestId('item-1').getAttribute('data-item-id')).toBe('low');
  });

  test('replacement mode overrides all items', ({ expect }) => {
    const menu = createMenu([createTestAction('base-1', 'Base Action')]);
    render(
      <>
        <Contributor menu={menu} id='additive' items={[createTestAction('add-1', 'Added')]} />
        <Contributor
          menu={menu}
          id='replacement'
          mode='replacement'
          items={[createTestAction('replacement-1', 'Replacement Only')]}
        />
        <Consumer menu={menu} />
      </>,
    );

    expect(screen.getByTestId('menu-items').children.length).toBe(1);
    expect(screen.getByText('Replacement Only')).toBeTruthy();
  });

  test('removes the contribution when the contributor unmounts', ({ expect }) => {
    const menu = createMenu([createTestAction('base-1', 'Base Action')]);
    const { rerender } = render(
      <>
        <Contributor menu={menu} id='test' items={[createTestAction('contrib-1', 'Contributed Action')]} />
        <Consumer menu={menu} />
      </>,
    );
    expect(screen.getByTestId('menu-items').children.length).toBe(2);

    rerender(<Consumer menu={menu} />);
    expect(screen.getByTestId('menu-items').children.length).toBe(1);
    expect(screen.queryByText('Contributed Action')).toBeNull();
  });
});
