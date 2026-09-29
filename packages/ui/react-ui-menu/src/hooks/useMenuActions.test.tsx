//
// Copyright 2025 DXOS.org
//

/// <reference types="@vitest/browser-playwright" />

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import { cleanup, render, screen } from '@testing-library/react';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import React, { StrictMode, Suspense, use, useState } from 'react';
import { afterEach, describe, test } from 'vitest';
import { cdp } from 'vitest/browser';

import { MenuBuilder } from '../builder.ts';
import { type MenuActions, type MenuItem, type MenuItemsAccessor } from '../types.ts';
import { createMenuAction } from '../util.ts';
import { makeMenuActions, useMenuBuilder, useMenuContribution, useMenuItems } from './useMenuActions.ts';

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

describe('useMenuBuilder', () => {
  afterEach(() => {
    cleanup();
  });

  test('once unmounted, leaves nothing in the registry', async ({ expect }) => {
    const registry = Registry.make();
    const renderToolbar = (label: string) => (
      <StrictMode>
        <RegistryContext.Provider value={registry}>
          <Toolbar label={label} />
        </RegistryContext.Provider>
      </StrictMode>
    );

    const { rerender, unmount } = render(renderToolbar('one'));
    rerender(renderToolbar('two'));
    rerender(renderToolbar('three'));
    expect(screen.getByTestId('item-0').textContent).toBe('three');

    unmount();
    await expect.poll(() => collectedSize(registry)).toBe(0);
  });

  test('a render that never commits leaves nothing in the registry', async ({ expect }) => {
    const registry = Registry.make();
    render(
      <RegistryContext.Provider value={registry}>
        <Suspense fallback={null}>
          <Toolbar label='one' />
          <Suspend />
        </Suspense>
      </RegistryContext.Provider>,
    );
    expect(screen.queryByTestId('item-0')).toBeNull();
    await expect.poll(() => collectedSize(registry)).toBe(0);
  });

  test('renders when its dependencies change on every render', ({ expect }) => {
    const Unstable = () => {
      const menu = useMenuBuilder(
        () =>
          MenuBuilder.make()
            .action('act', { label: 'act' }, () => {})
            .build(),
        [{}],
      );
      return <Consumer menu={menu} />;
    };

    render(
      <RegistryContext.Provider value={Registry.make()}>
        <Unstable />
      </RegistryContext.Provider>,
    );
    expect(screen.getByTestId('item-0').textContent).toBe('act');
  });
});

/** Its action closes over component state, as a real menu's does, so the graph can reach the fiber. */
const Toolbar = ({ label }: { label: string }) => {
  const [, setClicks] = useState(0);
  const menu = useMenuBuilder(
    () =>
      MenuBuilder.make()
        .action('act', { label }, () => setClicks((clicks) => clicks + 1))
        .build(),
    [label],
  );
  return <Consumer menu={menu} />;
};

/** Registry size once garbage is collected, which releases the atoms a graph model owns. */
const collectedSize = async (registry: Registry.AtomRegistry) => {
  await cdp().send('HeapProfiler.collectGarbage');
  return registry.getNodes().size;
};

const never = new Promise<never>(() => {});

/** Suspends forever, so the boundary it sits in never commits. */
const Suspend = () => use(never);
