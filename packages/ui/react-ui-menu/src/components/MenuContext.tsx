//
// Copyright 2025 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Scope, createContextScope } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useContext, useMemo } from 'react';

import { log } from '@dxos/log';

import {
  type AddMenuItemsProps,
  type MenuContextValue,
  type MenuItem,
  type MenuItemGroup,
  type MenuItems,
  type MenuItemsMap,
} from '../types';

type MenuScopedProps<P> = P & { __menuScope?: Scope };

const MENU_NAME = 'Menu';

const [createMenuContext, createMenuScope] = createContextScope(MENU_NAME, []);

export const menuContextDefaults: MenuContextValue = {
  iconSize: 5,
  useGroupItems: () => null,
  onAction: undefined,
  menuItemsAtom: Atom.make<MenuItemsMap>(new Map()),
  addMenuItems: () => {},
  removeMenuItems: () => {},
};

const [MenuContextProvider, useMenuScoped] = createMenuContext<MenuContextValue>(MENU_NAME, menuContextDefaults);

const useMenuScope = createMenuScope();

const DEFAULT_PRIORITY = 100;

function sortMenuItems(items: MenuItems[]) {
  return [...items].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.id.localeCompare(b.id);
  });
}

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
  const registry = useContext(RegistryContext);
  const menuItemsAtom = useMemo(() => Atom.make<MenuItemsMap>(new Map()).pipe(Atom.keepAlive), []);

  const addMenuItems = useCallback(
    (props: AddMenuItemsProps) => {
      const priority = props.priority ?? DEFAULT_PRIORITY;
      const prev = registry.get(menuItemsAtom);
      const next = new Map(prev);
      next.set(props.id, { ...props, priority });
      registry.set(menuItemsAtom, next);
    },
    [registry, menuItemsAtom],
  );

  const removeMenuItems = useCallback(
    (id: string) => {
      const prev = registry.get(menuItemsAtom);
      const next = new Map(prev);
      next.delete(id);
      registry.set(menuItemsAtom, next);
    },
    [registry, menuItemsAtom],
  );

  return (
    <MenuContextProvider
      useGroupItems={useGroupItems}
      iconSize={iconSize}
      attendableId={attendableId}
      alwaysActive={alwaysActive}
      menuItemsAtom={menuItemsAtom}
      addMenuItems={addMenuItems}
      removeMenuItems={removeMenuItems}
      onAction={onAction}
      scope={scope}
    >
      {children}
    </MenuContextProvider>
  );
};

function resolveItems(
  baseItems: MenuItem[] | null,
  group: MenuItemGroup | undefined,
  entries: ReadonlyMap<string, MenuItems>,
): MenuItem[] | null {
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
}

export const useMenuItems = (
  group?: MenuItemGroup,
  propsItems?: MenuItem[],
  consumerName: string = 'useMenuItemConsumer',
  __menuScope?: Scope,
) => {
  const { useGroupItems, menuItemsAtom } = useMenuScoped(consumerName, __menuScope);
  const groupItems = useGroupItems(group);
  const entries = useAtomValue(menuItemsAtom) ?? new Map();

  const baseItems = useMemo(() => propsItems ?? groupItems ?? null, [propsItems, groupItems]);

  const resolved = useMemo(
    () => resolveItems(baseItems, group, entries as ReadonlyMap<string, MenuItems>),
    [baseItems, group, entries],
  );

  return resolved ?? undefined;
};

/** Public hook -- returns the menu context without Radix scope. */
export const useMenu = (consumerName: string): MenuContextValue => {
  return useMenuScoped(consumerName, undefined);
};

export { useMenuScoped, createMenuScope, MenuProvider };

export type { MenuScopedProps, MenuProviderProps };
