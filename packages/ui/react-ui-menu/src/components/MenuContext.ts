//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { createContext as createReactContext, useMemo } from 'react';

import { log } from '@dxos/log';
import { createContext } from '@dxos/react-hooks';

import {
  type MenuContextValue,
  type MenuGroupContext,
  type MenuItem,
  type MenuItems,
  type MenuItemsAccessor,
  type MenuItemsMap,
} from '../types';

// Kept out of `Menu.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so contexts and hooks exported beside them force a full page reload on every edit.

//
// Context.
//

export const MENU_NAME = 'Menu';

const nullItemsAtom = Atom.make<MenuItem[] | null>(null);
const defaultItemsAccessor: MenuItemsAccessor = () => nullItemsAtom;

export const menuContextDefaults: MenuContextValue = {
  iconSize: 5,
  items: defaultItemsAccessor,
  onAction: undefined,
  menuItemsAtom: Atom.make<MenuItemsMap>(new Map()),
  addMenuItems: () => {},
  removeMenuItems: () => {},
};

export const [MenuContextProvider, useMenuScoped] = createContext<MenuContextValue>(MENU_NAME, menuContextDefaults);

//
// Dropdown context (internal) — allows Menu.Content to close the parent dropdown.
//

export type MenuDropdownContextValue = {
  closeMenu: () => void;
  caller?: string;
};

export const MenuDropdownContext = createReactContext<MenuDropdownContextValue>({
  closeMenu: () => {},
});

//
// Item resolution.
//

const sortMenuItems = (items: MenuItems[]) =>
  [...items].sort((a, b) => (a.priority !== b.priority ? a.priority - b.priority : a.id.localeCompare(b.id)));

export const resolveItems = (
  baseItems: MenuItem[] | null,
  group: MenuGroupContext | undefined,
  entries: ReadonlyMap<string, MenuItems>,
): MenuItem[] | null => {
  const applicable = [...entries.values()].filter((entry) => !entry.groupFilter || entry.groupFilter(group));
  if (applicable.length === 0) {
    return baseItems;
  }

  const sorted = sortMenuItems(applicable);

  const replacements = sorted.filter((entry) => entry.mode === 'replacement');
  if (replacements.length > 0) {
    if (replacements.length > 1) {
      log.warn('multiple replacement entries found', {
        ids: replacements.map((r) => r.id).join(', '),
        using: replacements[0].id,
      });
    }
    return replacements[0].items;
  }

  const additive = sorted.filter((entry) => entry.mode === 'additive');
  const additiveItems = additive.flatMap((entry) => entry.items);

  if (!baseItems || baseItems.length === 0) {
    return additiveItems.length > 0 ? additiveItems : null;
  }

  return [...baseItems, ...additiveItems];
};

//
// Public hooks.
//

export const useMenuItems = (
  group?: MenuGroupContext,
  propsItems?: MenuItem[],
  consumerName: string = 'useMenuItemConsumer',
) => {
  const { items, menuItemsAtom } = useMenuScoped(consumerName);
  const groupItems = useAtomValue(items(group));
  const entries = useAtomValue(menuItemsAtom) ?? new Map();

  const baseItems = useMemo(() => propsItems ?? groupItems ?? null, [propsItems, groupItems]);

  const resolved = useMemo(
    () => resolveItems(baseItems, group, entries as ReadonlyMap<string, MenuItems>),
    [baseItems, group, entries],
  );

  return resolved ?? undefined;
};

export const useMenu = (consumerName: string): MenuContextValue => {
  return useMenuScoped(consumerName);
};
