//
// Copyright 2025 DXOS.org
//

import { Atom, Registry, RegistryContext } from '@effect-atom/atom-react';
import { cleanup, render, renderHook, screen } from '@testing-library/react';
import React, { type PropsWithChildren, useMemo } from 'react';
import { afterEach, describe, test } from 'vitest';

import { type MenuItem } from '../types';
import { createMenuAction } from '../util';

import { MenuProvider, useMenuContribution, useMenuItems } from './MenuContext';

const createTestAction = (id: string, label: string): MenuItem =>
  createMenuAction(id, () => {}, { label, icon: 'ph--star--regular' });

const TestWrapper = ({ children }: PropsWithChildren) => {
  const registry = useMemo(() => Registry.make(), []);
  return (
    <RegistryContext.Provider value={registry}>
      <MenuProvider>{children}</MenuProvider>
    </RegistryContext.Provider>
  );
};

const createTestWrapperWithBaseItems = (baseItems: MenuItem[]) => {
  return ({ children }: PropsWithChildren) => {
    const registry = useMemo(() => Registry.make(), []);
    const useGroupItems = () => baseItems;
    return (
      <RegistryContext.Provider value={registry}>
        <MenuProvider useGroupItems={useGroupItems}>{children}</MenuProvider>
      </RegistryContext.Provider>
    );
  };
};

describe('MenuContext', () => {
  afterEach(() => {
    cleanup();
  });

  describe('useMenuContribution', () => {
    test('contributes static items to menu', ({ expect }) => {
      const contributedItems = [createTestAction('test-1', 'Test Action 1')];

      const ContributorComponent = () => {
        useMenuContribution({
          id: 'test-contributor',
          mode: 'additive',
          items: contributedItems,
        });
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

    test('contributes reactive items via atom', async ({ expect }) => {
      const registry = Registry.make();
      const itemsAtom = Atom.make<MenuItem[]>([createTestAction('reactive-1', 'Reactive 1')]).pipe(Atom.keepAlive);

      const ContributorComponent = () => {
        useMenuContribution({
          id: 'reactive-contributor',
          mode: 'additive',
          items: itemsAtom,
        });
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

      const Wrapper = ({ children }: PropsWithChildren) => (
        <RegistryContext.Provider value={registry}>
          <MenuProvider>{children}</MenuProvider>
        </RegistryContext.Provider>
      );

      render(
        <Wrapper>
          <ContributorComponent />
          <ConsumerComponent />
        </Wrapper>,
      );

      // Verify the atom-based contribution is rendered.
      expect(screen.getByTestId('item-reactive-1')).toBeTruthy();
      expect(screen.getByText('Reactive 1')).toBeTruthy();
    });

    test('combines base items with contributions', ({ expect }) => {
      const baseItems = [createTestAction('base-1', 'Base Action')];
      const contributedItems = [createTestAction('contrib-1', 'Contributed Action')];

      const ContributorComponent = () => {
        useMenuContribution({
          id: 'test-contributor',
          mode: 'additive',
          items: contributedItems,
        });
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

      // Base items should come first, then contributions.
      const menuItems = screen.getByTestId('menu-items');
      expect(menuItems.children.length).toBe(2);
      expect(screen.getByTestId('item-base-1')).toBeTruthy();
      expect(screen.getByTestId('item-contrib-1')).toBeTruthy();
    });

    test('orders contributions by priority', ({ expect }) => {
      const LowPriorityContributor = () => {
        useMenuContribution({
          id: 'low-priority',
          mode: 'additive',
          items: [createTestAction('low', 'Low Priority')],
          priority: 200,
        });
        return null;
      };

      const HighPriorityContributor = () => {
        useMenuContribution({
          id: 'high-priority',
          mode: 'additive',
          items: [createTestAction('high', 'High Priority')],
          priority: 50,
        });
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
          {/* Order in JSX doesn't matter - priority determines order. */}
          <LowPriorityContributor />
          <HighPriorityContributor />
          <ConsumerComponent />
        </TestWrapper>,
      );

      // High priority (lower number) should come first.
      const firstItem = screen.getByTestId('item-0');
      const secondItem = screen.getByTestId('item-1');

      expect(firstItem.getAttribute('data-item-id')).toBe('high');
      expect(secondItem.getAttribute('data-item-id')).toBe('low');
    });

    test('replacement mode overrides all items', ({ expect }) => {
      const baseItems = [createTestAction('base-1', 'Base Action')];
      const replacementItems = [createTestAction('replacement-1', 'Replacement Action')];

      const ReplacementContributor = () => {
        useMenuContribution({
          id: 'replacement-contributor',
          mode: 'replacement',
          items: replacementItems,
        });
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

      // Should only have replacement item, not base item.
      expect(screen.queryByTestId('item-base-1')).toBeNull();
      expect(screen.getByTestId('item-replacement-1')).toBeTruthy();
    });

    test('unregisters contribution on unmount', ({ expect }) => {
      const contributedItems = [createTestAction('unmount-test', 'Will Be Removed')];

      const ContributorComponent = () => {
        useMenuContribution({
          id: 'unmount-contributor',
          mode: 'additive',
          items: contributedItems,
        });
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

      const registry = Registry.make();
      const Wrapper = ({ children }: PropsWithChildren) => (
        <RegistryContext.Provider value={registry}>
          <MenuProvider>{children}</MenuProvider>
        </RegistryContext.Provider>
      );

      const { rerender } = render(
        <Wrapper>
          <ContributorComponent />
          <ConsumerComponent />
        </Wrapper>,
      );

      expect(screen.getByTestId('item-unmount-test')).toBeTruthy();

      // Unmount the contributor.
      rerender(
        <Wrapper>
          <ConsumerComponent />
        </Wrapper>,
      );

      expect(screen.queryByTestId('item-unmount-test')).toBeNull();
    });

    test('deterministic ordering with same priority uses id', ({ expect }) => {
      const ContributorA = () => {
        useMenuContribution({
          id: 'contributor-a',
          mode: 'additive',
          items: [createTestAction('item-a', 'Item A')],
          priority: 100,
        });
        return null;
      };

      const ContributorB = () => {
        useMenuContribution({
          id: 'contributor-b',
          mode: 'additive',
          items: [createTestAction('item-b', 'Item B')],
          priority: 100,
        });
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
          {/* Render B before A in JSX. */}
          <ContributorB />
          <ContributorA />
          <ConsumerComponent />
        </TestWrapper>,
      );

      // With same priority, should be sorted alphabetically by id.
      const firstItem = screen.getByTestId('item-0');
      const secondItem = screen.getByTestId('item-1');

      expect(firstItem.getAttribute('data-item-id')).toBe('item-a');
      expect(secondItem.getAttribute('data-item-id')).toBe('item-b');
    });

    test('groupFilter limits contribution to specific groups', ({ expect }) => {
      const globalContributedItems = [createTestAction('global-item', 'Global Item')];
      const groupFilteredItems = [createTestAction('group-item', 'Group Only Item')];

      const GlobalContributor = () => {
        useMenuContribution({
          id: 'global-contributor',
          mode: 'additive',
          items: globalContributedItems,
        });
        return null;
      };

      const FilteredContributor = () => {
        useMenuContribution({
          id: 'filtered-contributor',
          mode: 'additive',
          items: groupFilteredItems,
          groupFilter: (group) => group?.id === 'special-group',
        });
        return null;
      };

      // Consumer for root group (no group specified).
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

      // Root should only have global item, not the group-filtered item.
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

      const ObjectActionsContributor = () => {
        useMenuContribution({
          id: 'object-actions',
          mode: 'additive',
          priority: 50,
          items: [navigateItem],
        });
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
