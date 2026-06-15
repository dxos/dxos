//
// Copyright 2025 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import React, { type PropsWithChildren, useEffect } from 'react';
import { afterEach, describe, test } from 'vitest';

import { type MenuItem, type MenuItemsAccessor } from '../types';
import { createMenuAction } from '../util';
import { Menu, useMenu, useMenuItems } from './Menu';

const TEST_CONTRIBUTOR = 'TestContributor';

const createTestAction = (id: string, label: string): MenuItem =>
  createMenuAction(id, () => {}, { label, icon: 'ph--star--regular' });

const TestWrapper = ({ children }: PropsWithChildren) => {
  return <Menu.Root>{children}</Menu.Root>;
};

const createTestWrapperWithBaseItems = (baseItems: MenuItem[]) => {
  const baseItemsAtom = Atom.make<MenuItem[] | null>(baseItems);
  const items: MenuItemsAccessor = () => baseItemsAtom;
  return ({ children }: PropsWithChildren) => {
    return <Menu.Root items={items}>{children}</Menu.Root>;
  };
};

describe('Menu', () => {
  afterEach(() => {
    cleanup();
  });

  describe('imperative contribution API', () => {
    test('contributes static items to menu', ({ expect }) => {
      const contributedItems = [createTestAction('test-1', 'Test Action 1')];

      const ContributorComponent = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'test-contributor', mode: 'additive', items: contributedItems });
          return () => menu.removeMenuItems('test-contributor');
        }, [menu, contributedItems]);
        return null;
      };

      const ConsumerComponent = () => {
        const items = useMenuItems();
        return (
          <div data-testid='menu-items'>
            {items?.map((item) => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                {(item.properties as { label?: string })?.label}
              </div>
            ))}
          </div>
        );
      };

      render(
        <TestWrapper>
          <ContributorComponent />
          <ConsumerComponent />
        </TestWrapper>,
      );

      expect(screen.getByTestId('item-test-1')).toBeTruthy();
      expect(screen.getByText('Test Action 1')).toBeTruthy();
    });

    test('contributes items that update when deps change', ({ expect }) => {
      const ContributorComponent = ({ items }: { items: MenuItem[] }) => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'reactive-contributor', mode: 'additive', items });
          return () => menu.removeMenuItems('reactive-contributor');
        }, [menu, items]);
        return null;
      };

      const ConsumerComponent = () => {
        const items = useMenuItems();
        return (
          <div data-testid='menu-items'>
            {items?.map((item) => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                {(item.properties as { label?: string })?.label}
              </div>
            ))}
          </div>
        );
      };

      const items = [createTestAction('reactive-1', 'Reactive 1')];
      render(
        <TestWrapper>
          <ContributorComponent items={items} />
          <ConsumerComponent />
        </TestWrapper>,
      );

      expect(screen.getByTestId('item-reactive-1')).toBeTruthy();
      expect(screen.getByText('Reactive 1')).toBeTruthy();
    });

    test('combines base items with contributions', ({ expect }) => {
      const baseItems = [createTestAction('base-1', 'Base Action')];
      const contributedItems = [createTestAction('contrib-1', 'Contributed Action')];

      const ContributorComponent = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'test-contributor', mode: 'additive', items: contributedItems });
          return () => menu.removeMenuItems('test-contributor');
        }, [menu, contributedItems]);
        return null;
      };

      const ConsumerComponent = () => {
        const items = useMenuItems();
        return (
          <div data-testid='menu-items'>
            {items?.map((item) => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                {(item.properties as { label?: string })?.label}
              </div>
            ))}
          </div>
        );
      };

      const WrapperWithBase = createTestWrapperWithBaseItems(baseItems);

      render(
        <WrapperWithBase>
          <ContributorComponent />
          <ConsumerComponent />
        </WrapperWithBase>,
      );

      const menuItems = screen.getByTestId('menu-items');
      expect(menuItems.children.length).toBe(2);
      expect(screen.getByTestId('item-base-1')).toBeTruthy();
      expect(screen.getByTestId('item-contrib-1')).toBeTruthy();
    });

    test('orders contributions by priority', ({ expect }) => {
      const lowItems = [createTestAction('low', 'Low Priority')];
      const highItems = [createTestAction('high', 'High Priority')];
      const LowPriorityContributor = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'low-priority', mode: 'additive', items: lowItems, priority: 200 });
          return () => menu.removeMenuItems('low-priority');
        }, [menu, lowItems]);
        return null;
      };

      const HighPriorityContributor = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'high-priority', mode: 'additive', items: highItems, priority: 50 });
          return () => menu.removeMenuItems('high-priority');
        }, [menu, highItems]);
        return null;
      };

      const ConsumerComponent = () => {
        const items = useMenuItems();
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

      render(
        <TestWrapper>
          <LowPriorityContributor />
          <HighPriorityContributor />
          <ConsumerComponent />
        </TestWrapper>,
      );

      const firstItem = screen.getByTestId('item-0');
      const secondItem = screen.getByTestId('item-1');

      expect(firstItem.getAttribute('data-item-id')).toBe('high');
      expect(secondItem.getAttribute('data-item-id')).toBe('low');
    });

    test('replacement mode overrides all items', ({ expect }) => {
      const baseItems = [createTestAction('base-1', 'Base Action')];
      const replacementItems = [createTestAction('replacement-1', 'Replacement Action')];

      const ReplacementContributor = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'replacement-contributor', mode: 'replacement', items: replacementItems });
          return () => menu.removeMenuItems('replacement-contributor');
        }, [menu, replacementItems]);
        return null;
      };

      const ConsumerComponent = () => {
        const items = useMenuItems();
        return (
          <div data-testid='menu-items'>
            {items?.map((item) => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                {(item.properties as { label?: string })?.label}
              </div>
            ))}
          </div>
        );
      };

      const WrapperWithBase = createTestWrapperWithBaseItems(baseItems);

      render(
        <WrapperWithBase>
          <ReplacementContributor />
          <ConsumerComponent />
        </WrapperWithBase>,
      );

      expect(screen.queryByTestId('item-base-1')).toBeNull();
      expect(screen.getByTestId('item-replacement-1')).toBeTruthy();
    });

    test('removeMenuItems on unmount clears contribution', ({ expect }) => {
      const contributedItems = [createTestAction('unmount-test', 'Will Be Removed')];

      const ContributorComponent = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'unmount-contributor', mode: 'additive', items: contributedItems });
          return () => menu.removeMenuItems('unmount-contributor');
        }, [menu, contributedItems]);
        return null;
      };

      const ConsumerComponent = () => {
        const items = useMenuItems();
        return (
          <div data-testid='menu-items'>
            {items?.map((item) => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                {(item.properties as { label?: string })?.label}
              </div>
            ))}
          </div>
        );
      };

      const { rerender } = render(
        <TestWrapper>
          <ContributorComponent />
          <ConsumerComponent />
        </TestWrapper>,
      );

      expect(screen.getByTestId('item-unmount-test')).toBeTruthy();

      rerender(
        <TestWrapper>
          <ConsumerComponent />
        </TestWrapper>,
      );

      expect(screen.queryByTestId('item-unmount-test')).toBeNull();
    });

    test('deterministic ordering with same priority uses id', ({ expect }) => {
      const itemsA = [createTestAction('item-a', 'Item A')];
      const itemsB = [createTestAction('item-b', 'Item B')];
      const ContributorA = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'contributor-a', mode: 'additive', items: itemsA, priority: 100 });
          return () => menu.removeMenuItems('contributor-a');
        }, [menu, itemsA]);
        return null;
      };

      const ContributorB = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'contributor-b', mode: 'additive', items: itemsB, priority: 100 });
          return () => menu.removeMenuItems('contributor-b');
        }, [menu, itemsB]);
        return null;
      };

      const ConsumerComponent = () => {
        const items = useMenuItems();
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

      render(
        <TestWrapper>
          <ContributorB />
          <ContributorA />
          <ConsumerComponent />
        </TestWrapper>,
      );

      const firstItem = screen.getByTestId('item-0');
      const secondItem = screen.getByTestId('item-1');

      expect(firstItem.getAttribute('data-item-id')).toBe('item-a');
      expect(secondItem.getAttribute('data-item-id')).toBe('item-b');
    });

    test('groupFilter limits contribution to specific groups', ({ expect }) => {
      const globalContributedItems = [createTestAction('global-item', 'Global Item')];
      const groupFilteredItems = [createTestAction('group-item', 'Group Only Item')];

      const GlobalContributor = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'global-contributor', mode: 'additive', items: globalContributedItems });
          return () => menu.removeMenuItems('global-contributor');
        }, [menu, globalContributedItems]);
        return null;
      };

      const FilteredContributor = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({
            id: 'filtered-contributor',
            mode: 'additive',
            items: groupFilteredItems,
            groupFilter: (group) => group?.id === 'special-group',
          });
          return () => menu.removeMenuItems('filtered-contributor');
        }, [menu, groupFilteredItems]);
        return null;
      };

      const RootConsumer = () => {
        const items = useMenuItems();
        return (
          <div data-testid='root-items'>
            {items?.map((item) => (
              <div key={item.id} data-testid={`root-${item.id}`}>
                {(item.properties as { label?: string })?.label}
              </div>
            ))}
          </div>
        );
      };

      render(
        <TestWrapper>
          <GlobalContributor />
          <FilteredContributor />
          <RootConsumer />
        </TestWrapper>,
      );

      expect(screen.getByTestId('root-global-item')).toBeTruthy();
      expect(screen.queryByTestId('root-group-item')).toBeNull();
    });
  });

  describe('useMenuItems', () => {
    test('returns undefined when no items available', ({ expect }) => {
      const { result } = renderHook(() => useMenuItems(), { wrapper: TestWrapper });
      expect(result.current).toBeUndefined();
    });

    test('returns base items from context', ({ expect }) => {
      const baseItems = [createTestAction('context-item', 'Context Item')];
      const wrapper = createTestWrapperWithBaseItems(baseItems);

      const { result } = renderHook(() => useMenuItems(), { wrapper });
      expect(result.current).toHaveLength(1);
      expect(result.current?.[0].id).toBe('context-item');
    });

    test('props items take precedence over context items', ({ expect }) => {
      const contextItems = [createTestAction('context-item', 'Context Item')];
      const propsItems = [createTestAction('props-item', 'Props Item')];
      const wrapper = createTestWrapperWithBaseItems(contextItems);

      const { result } = renderHook(() => useMenuItems(undefined, propsItems), { wrapper });
      expect(result.current).toHaveLength(1);
      expect(result.current?.[0].id).toBe('props-item');
    });

    test('object-actions contribution pattern (navigate item) appears in useMenuItems', ({ expect }) => {
      const navigateItem = createMenuAction('navigate', () => {}, {
        label: 'Open',
        icon: 'ph--arrow-square-out--regular',
      });
      const items = [navigateItem];

      const ObjectActionsContributor = () => {
        const menu = useMenu(TEST_CONTRIBUTOR);
        useEffect(() => {
          menu.addMenuItems({ id: 'object-actions', mode: 'additive', priority: 50, items });
          return () => menu.removeMenuItems('object-actions');
        }, [menu, items]);
        return null;
      };

      const ConsumerComponent = () => {
        const items = useMenuItems();
        return (
          <div data-testid='menu-items'>
            {items?.map((item) => (
              <div key={item.id} data-testid={`item-${item.id}`}>
                {(item.properties as { label?: string })?.label}
              </div>
            ))}
          </div>
        );
      };

      render(
        <TestWrapper>
          <ObjectActionsContributor />
          <ConsumerComponent />
        </TestWrapper>,
      );

      expect(screen.getByTestId('item-navigate')).toBeTruthy();
      expect(screen.getByText('Open')).toBeTruthy();
    });
  });
});
