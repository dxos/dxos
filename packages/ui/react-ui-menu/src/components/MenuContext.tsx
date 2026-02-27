//
// Copyright 2025 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Scope, createContextScope } from '@radix-ui/react-context';
import React, { type PropsWithChildren, createContext, useContext, useEffect, useMemo, useRef } from 'react';

import { log } from '@dxos/log';

import {
  type MenuContextValue,
  type MenuContribution,
  type MenuContributionInput,
  type MenuItem,
  type MenuItemGroup,
} from '../types';

export type MenuScopedProps<P> = P & { __menuScope?: Scope };

const MENU_NAME = 'Menu';

const [createMenuContext, createMenuScope] = createContextScope(MENU_NAME, []);

const [MenuContextProvider, useMenu] = createMenuContext<MenuContextValue>(MENU_NAME);

export const menuContextDefaults: MenuContextValue = {
  iconSize: 5,
  useGroupItems: () => null,
  onAction: undefined,
};

const useMenuScope = createMenuScope();

//
// Menu Contribution Registry.
//

type ContributionRegistry = {
  contributionsAtom: Atom.Writable<MenuContribution[]>;
  register: (contribution: MenuContribution) => void;
  unregister: (id: string) => void;
};

const ContributionRegistryContext = createContext<ContributionRegistry | null>(null);

const DEFAULT_PRIORITY = 100;

/**
 * Sorts contributions by priority (ascending), then by id (alphabetically) for deterministic ordering.
 */
const sortContributions = (contributions: MenuContribution[]): MenuContribution[] => {
  return [...contributions].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.id.localeCompare(b.id);
  });
};

type MenuProviderProps = PropsWithChildren<Partial<MenuContextValue>>;

const MenuProvider = ({
  children,
  useGroupItems = menuContextDefaults.useGroupItems,
  iconSize = menuContextDefaults.iconSize,
  attendableId,
  onAction,
}: MenuProviderProps) => {
  const { scope } = useMenuScope(undefined);
  const registry = useContext(RegistryContext);

  // Create contribution registry atom.
  const contributionsAtom = useMemo(() => Atom.make<MenuContribution[]>([]).pipe(Atom.keepAlive), []);

  const contributionRegistry = useMemo<ContributionRegistry>(
    () => ({
      contributionsAtom,
      register: (contribution: MenuContribution) => {
        const current = registry.get(contributionsAtom);
        const existingIndex = current.findIndex((c) => c.id === contribution.id);
        if (existingIndex >= 0) {
          // Update existing contribution.
          const updated = [...current];
          updated[existingIndex] = contribution;
          registry.set(contributionsAtom, updated);
        } else {
          registry.set(contributionsAtom, [...current, contribution]);
        }
      },
      unregister: (id: string) => {
        const current = registry.get(contributionsAtom);
        registry.set(
          contributionsAtom,
          current.filter((c) => c.id !== id),
        );
      },
    }),
    [contributionsAtom, registry],
  );

  return (
    <ContributionRegistryContext.Provider value={contributionRegistry}>
      <MenuContextProvider
        useGroupItems={useGroupItems}
        iconSize={iconSize}
        attendableId={attendableId}
        onAction={onAction}
        scope={scope}
      >
        {children}
      </MenuContextProvider>
    </ContributionRegistryContext.Provider>
  );
};

/**
 * Hook to contribute menu items to the parent MenuProvider.
 *
 * @example Static items
 * ```tsx
 * useMenuContribution({
 *   id: 'my-plugin',
 *   mode: 'additive',
 *   items: [myAction1, myAction2],
 * });
 * ```
 *
 * @example Reactive items with atom
 * ```tsx
 * const itemsAtom = useMemo(() => Atom.make(myItems), []);
 * useMenuContribution({
 *   id: 'reactive-plugin',
 *   mode: 'additive',
 *   items: itemsAtom,
 * });
 * ```
 */
export const useMenuContribution = (input: MenuContributionInput): void => {
  const contributionRegistry = useContext(ContributionRegistryContext);
  const registry = useContext(RegistryContext);

  // Track static atom separately to enable updates.
  const staticAtomRef = useRef<Atom.Writable<MenuItem[]> | null>(null);
  const externalAtomRef = useRef<Atom.Atom<MenuItem[]> | null>(null);

  const inputItems = input.items;
  const isStaticItems = Array.isArray(inputItems);

  // Initialize or update atoms.
  if (isStaticItems) {
    if (!staticAtomRef.current) {
      staticAtomRef.current = Atom.make<MenuItem[]>(inputItems).pipe(Atom.keepAlive);
    } else {
      // Update existing static atom if items changed.
      const currentItems = registry.get(staticAtomRef.current);
      if (currentItems !== inputItems) {
        registry.set(staticAtomRef.current, inputItems);
      }
    }
  } else {
    externalAtomRef.current = inputItems;
  }

  const itemsAtom = isStaticItems ? staticAtomRef.current : externalAtomRef.current;

  useEffect(() => {
    if (!contributionRegistry || !itemsAtom) {
      return;
    }

    const contribution: MenuContribution = {
      id: input.id,
      mode: input.mode,
      priority: input.priority ?? DEFAULT_PRIORITY,
      items: itemsAtom,
      groupFilter: input.groupFilter,
    };

    contributionRegistry.register(contribution);

    return () => {
      contributionRegistry.unregister(input.id);
    };
  }, [contributionRegistry, input.id, input.mode, input.priority, input.groupFilter, itemsAtom]);
};

/**
 * Resolves menu items by combining base items with contributions.
 */
const useResolvedItems = (
  baseItems: MenuItem[] | null,
  group: MenuItemGroup | undefined,
  contributionsAtom: Atom.Writable<MenuContribution[]>,
): MenuItem[] | null => {
  const contributions = useAtomValue(contributionsAtom);
  const registry = useContext(RegistryContext);

  return useMemo(() => {
    // Filter contributions that apply to this group.
    const applicableContributions = contributions.filter((c) => !c.groupFilter || c.groupFilter(group));

    if (applicableContributions.length === 0) {
      return baseItems;
    }

    const sorted = sortContributions(applicableContributions);

    // Check for replacement mode contributions.
    const replacements = sorted.filter((c) => c.mode === 'replacement');
    if (replacements.length > 0) {
      if (replacements.length > 1) {
        log.warn('multiple replacement contributions found', {
          ids: replacements.map((r) => r.id).join(', '),
          using: replacements[0].id,
        });
      }
      // Return the items from the highest priority replacement.
      return registry.get(replacements[0].items);
    }

    // Additive mode: base items first, then contributions in priority order.
    const additiveContributions = sorted.filter((c) => c.mode === 'additive');
    const contributedItems = additiveContributions.flatMap((c) => registry.get(c.items));

    if (!baseItems || baseItems.length === 0) {
      return contributedItems.length > 0 ? contributedItems : null;
    }

    return [...baseItems, ...contributedItems];
  }, [baseItems, contributions, group, registry]);
};

export const useMenuItems = (
  group?: MenuItemGroup,
  propsItems?: MenuItem[],
  consumerName: string = 'useMenuItemConsumer',
  __menuScope?: Scope,
) => {
  const { useGroupItems } = useMenu(consumerName, __menuScope);
  const groupItems = useGroupItems(group);
  const contributionRegistry = useContext(ContributionRegistryContext);

  // Get base items (props take precedence over context).
  const baseItems = useMemo(() => propsItems ?? groupItems ?? null, [propsItems, groupItems]);

  // Resolve with contributions if registry exists.
  const resolvedItems = useResolvedItems(
    baseItems,
    group,
    contributionRegistry?.contributionsAtom ?? Atom.make<MenuContribution[]>([]),
  );

  // If no contribution registry, return base items.
  if (!contributionRegistry) {
    return baseItems ?? undefined;
  }

  return resolvedItems ?? undefined;
};

export { useMenu, createMenuScope, MenuProvider };

export type { MenuProviderProps };
