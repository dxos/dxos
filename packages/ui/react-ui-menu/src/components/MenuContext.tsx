//
// Copyright 2025 DXOS.org
//

import { Atom, Registry, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Scope, createContext, createContextScope } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useMemo } from 'react';

import { log } from '@dxos/log';

import { type MenuContextValue, type MenuItem, type MenuItemGroup } from '../types';

export type MenuScopedProps<P> = P & { __menuScope?: Scope };

const MENU_NAME = 'Menu';

const [createMenuContext, createMenuScope] = createContextScope(MENU_NAME, []);

export const menuContextDefaults: MenuContextValue = {
  iconSize: 5,
  useGroupItems: () => null,
  onAction: undefined,
};

const [MenuContextProvider, useMenu] = createMenuContext<MenuContextValue>(MENU_NAME, menuContextDefaults);

const useMenuScope = createMenuScope();

//
// Menu contribution API (imperative). Plain context like mosaic – one provider per MenuProvider, no scope.
//

export type MenuContributionMode = 'additive' | 'replacement';

export type MenuContribution = {
  id: string;
  mode: MenuContributionMode;
  priority?: number;
  items: MenuItem[];
  groupFilter?: (group?: MenuItemGroup) => boolean;
};

const DEFAULT_PRIORITY = 100;

type ContributionMap = Map<string, MenuContribution & { priority: number }>;

const MENU_CONTRIBUTION_DEFAULT: MenuContributionContextValue = {
  contributionsAtom: Atom.make<ContributionMap>(new Map()),
  addContribution: () => {},
  removeContribution: () => {},
};

function sortContributions(contributions: (MenuContribution & { priority: number })[]) {
  return [...contributions].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.id.localeCompare(b.id);
  });
}

export type MenuContributionContextValue = {
  contributionsAtom: Atom.Atom<ContributionMap>;
  addContribution: (record: MenuContribution) => void;
  removeContribution: (id: string) => void;
};

const [MenuContributionProvider, useMenuContributions] = createContext<MenuContributionContextValue>(
  'MenuContribution',
  MENU_CONTRIBUTION_DEFAULT,
);

type MenuProviderProps = PropsWithChildren<Partial<MenuContextValue>>;

const MenuProvider = ({
  children,
  useGroupItems = menuContextDefaults.useGroupItems,
  iconSize = menuContextDefaults.iconSize,
  attendableId,
  alwaysActive,
  onAction,
}: MenuProviderProps) => {
  const { scope } = useMenuScope(undefined);
  const registry = useMemo(() => Registry.make(), []);
  const contributionsAtom = useMemo(() => Atom.make<ContributionMap>(new Map()).pipe(Atom.keepAlive), []);

  const addContribution = useCallback(
    (contribution: MenuContribution) => {
      const priority = contribution.priority ?? DEFAULT_PRIORITY;
      const prev = registry.get(contributionsAtom);
      const next = new Map(prev);
      next.set(contribution.id, { ...contribution, priority });
      registry.set(contributionsAtom, next);
    },
    [registry, contributionsAtom],
  );

  const removeContribution = useCallback(
    (id: string) => {
      const prev = registry.get(contributionsAtom);
      const next = new Map(prev);
      next.delete(id);
      registry.set(contributionsAtom, next);
    },
    [registry, contributionsAtom],
  );

  const contributionContextValue = useMemo<MenuContributionContextValue>(
    () => ({ contributionsAtom, addContribution, removeContribution }),
    [contributionsAtom, addContribution, removeContribution],
  );

  return (
    <RegistryContext.Provider value={registry}>
      <MenuContributionProvider {...contributionContextValue}>
        <MenuContextProvider
          useGroupItems={useGroupItems}
          iconSize={iconSize}
          attendableId={attendableId}
          alwaysActive={alwaysActive}
          onAction={onAction}
          scope={scope}
        >
          {children}
        </MenuContextProvider>
      </MenuContributionProvider>
    </RegistryContext.Provider>
  );
};

function resolveItems(
  baseItems: MenuItem[] | null,
  group: MenuItemGroup | undefined,
  contributions: ReadonlyMap<string, MenuContribution & { priority: number }>,
): MenuItem[] | null {
  const applicable = [...contributions.values()].filter((c) => !c.groupFilter || c.groupFilter(group));
  if (applicable.length === 0) {
    return baseItems;
  }

  const sorted = sortContributions(applicable);

  const replacements = sorted.filter((c) => c.mode === 'replacement');
  if (replacements.length > 0) {
    if (replacements.length > 1) {
      log.warn('multiple replacement contributions found', {
        ids: replacements.map((r) => r.id).join(', '),
        using: replacements[0].id,
      });
    }
    return replacements[0].items;
  }

  const additive = sorted.filter((c) => c.mode === 'additive');
  const contributedItems = additive.flatMap((c) => c.items);

  if (!baseItems || baseItems.length === 0) {
    return contributedItems.length > 0 ? contributedItems : null;
  }

  return [...baseItems, ...contributedItems];
}

export const useMenuItems = (
  group?: MenuItemGroup,
  propsItems?: MenuItem[],
  consumerName: string = 'useMenuItemConsumer',
  __menuScope?: Scope,
) => {
  const { useGroupItems } = useMenu(consumerName, __menuScope);
  const groupItems = useGroupItems(group);
  const { contributionsAtom } = useMenuContributions(consumerName);
  const contributions = useAtomValue(contributionsAtom) ?? new Map();

  const baseItems = useMemo(() => propsItems ?? groupItems ?? null, [propsItems, groupItems]);

  const resolved = useMemo(
    () => resolveItems(baseItems, group, contributions as ReadonlyMap<string, MenuContribution & { priority: number }>),
    [baseItems, group, contributions],
  );

  return resolved ?? undefined;
};

export { useMenu, useMenuContributions, createMenuScope, MenuProvider };

export type { MenuProviderProps };
