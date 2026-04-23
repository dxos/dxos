//
// Copyright 2025 DXOS.org
//

import { Atom, RegistryContext, useAtomValue } from '@effect-atom/atom-react';
import { type Scope, createContextScope } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { createContext, type MouseEvent, type PropsWithChildren, useCallback, useContext, useMemo } from 'react';

import { log } from '@dxos/log';
import { type DropdownMenuRootProps, Icon, DropdownMenu as NaturalDropdownMenu } from '@dxos/react-ui';

import {
  type AddMenuItemsProps,
  type MenuAction,
  type MenuContextValue,
  type MenuItem,
  type MenuItemGroup,
  type MenuItems,
  type MenuItemsAccessor,
  type MenuItemsMap,
} from '../types';
import { executeMenuAction } from '../util';
import { ActionLabel } from './ActionLabel';
import { ToolbarMenu } from './ToolbarMenu';

//
// Scoped context.
//

type MenuScopedProps<P> = P & { __menuScope?: Scope };

const MENU_NAME = 'Menu';

const [createMenuContext, createMenuScope] = createContextScope(MENU_NAME, []);

const nullItemsAtom = Atom.make<MenuItem[] | null>(null);
const defaultItemsAccessor: MenuItemsAccessor = () => nullItemsAtom;

const menuContextDefaults: MenuContextValue = {
  iconSize: 5,
  items: defaultItemsAccessor,
  onAction: undefined,
  menuItemsAtom: Atom.make<MenuItemsMap>(new Map()),
  addMenuItems: () => {},
  removeMenuItems: () => {},
};

const [MenuContextProvider, useMenuScoped] = createMenuContext<MenuContextValue>(MENU_NAME, menuContextDefaults);

const useMenuScope = createMenuScope();

//
// Dropdown context (internal) — allows Menu.Content to close the parent dropdown.
//

type MenuDropdownContextValue = {
  closeMenu: () => void;
  caller?: string;
};

const MenuDropdownContext = createContext<MenuDropdownContextValue>({
  closeMenu: () => {},
});

//
// MenuProvider (internal) — the context provider used by Menu.Root.
//

const DEFAULT_PRIORITY = 100;

const sortMenuItems = (items: MenuItems[]) =>
  [...items].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.id.localeCompare(b.id);
  });

type MenuProviderProps = PropsWithChildren<Partial<MenuContextValue>>;

const MenuProvider = ({
  children,
  items = menuContextDefaults.items,
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
      items={items}
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

//
// Item resolution.
//

const resolveItems = (
  baseItems: MenuItem[] | null,
  group: MenuItemGroup | undefined,
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

const useMenuItems = (
  group?: MenuItemGroup,
  propsItems?: MenuItem[],
  consumerName: string = 'useMenuItemConsumer',
  __menuScope?: Scope,
) => {
  const { items, menuItemsAtom } = useMenuScoped(consumerName, __menuScope);
  const groupItems = useAtomValue(items(group));
  const entries = useAtomValue(menuItemsAtom) ?? new Map();

  const baseItems = useMemo(() => propsItems ?? groupItems ?? null, [propsItems, groupItems]);

  const resolved = useMemo(
    () => resolveItems(baseItems, group, entries as ReadonlyMap<string, MenuItems>),
    [baseItems, group, entries],
  );

  return resolved ?? undefined;
};

/** Returns the menu context without Radix scope. */
const useMenu = (consumerName: string): MenuContextValue => {
  return useMenuScoped(consumerName, undefined);
};

//
// Menu.Root
//

type MenuRootProps = MenuProviderProps &
  Pick<DropdownMenuRootProps, 'children' | 'open' | 'defaultOpen' | 'onOpenChange'> & {
    /** Identifies the component that owns this menu (passed to action handlers). */
    caller?: string;
  };

/**
 * Menu context boundary.
 *
 * NOTE: This component is headless since it's root div has `contents`.
 *
 * Provides the menu context (action dispatch, contribution registry, icon size, etc.)
 * and an optional dropdown root for use with `Menu.Trigger` + `Menu.Content`.
 */
const MenuRoot = ({ children, open, defaultOpen, onOpenChange, caller, ...props }: MenuRootProps) => {
  const [menuOpen, setMenuOpen] = useControllableState({
    prop: open,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  });

  const closeMenu = useCallback(() => setMenuOpen(false), [setMenuOpen]);

  return (
    <MenuProvider {...props}>
      <MenuDropdownContext.Provider value={{ closeMenu, caller }}>
        <NaturalDropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          {children}
        </NaturalDropdownMenu.Root>
      </MenuDropdownContext.Provider>
    </MenuProvider>
  );
};

//
// Menu.Content
//

type MenuContentProps = {
  group?: MenuItemGroup;
  items?: MenuItem[];
  caller?: string;
};

const MenuContentItem = ({
  item,
  onClick,
  __menuScope,
}: MenuScopedProps<{
  item: MenuItem;
  onClick: (action: MenuAction, event: MouseEvent) => void;
}>) => {
  const action = item as MenuAction;
  const handleClick = useCallback((event: MouseEvent) => onClick(action, event), [action, onClick]);
  const { iconSize } = useMenuScoped('MenuContentItem', __menuScope);
  return (
    <NaturalDropdownMenu.Item
      onClick={handleClick}
      classNames='gap-2'
      disabled={action.properties?.disabled}
      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
    >
      {action.properties?.icon && <Icon icon={action.properties!.icon} size={iconSize} />}
      <ActionLabel action={action} />
    </NaturalDropdownMenu.Item>
  );
};

/**
 * Renders the dropdown menu portal, content, and graph-backed items.
 *
 * Must be a descendant of `Menu.Root`. Reads items via `useMenuItems` from the
 * nearest menu context, with optional `group`/`items` prop overrides.
 */
const MenuContent = ({
  group,
  items: propsItems,
  caller: callerOverride,
  __menuScope,
}: MenuScopedProps<MenuContentProps>) => {
  const { closeMenu, caller: contextCaller } = useContext(MenuDropdownContext);
  const caller = callerOverride ?? contextCaller;
  const { onAction } = useMenuScoped('MenuContent', __menuScope);
  const resolvedItems = useMenuItems(group, propsItems, 'MenuContent', __menuScope);

  const handleActionClick = useCallback(
    (action: MenuAction, event: MouseEvent) => {
      if (action.properties?.disabled) {
        return;
      }
      event.stopPropagation();
      closeMenu();
      if (onAction) {
        onAction(action, { parent: group, caller });
      } else {
        void executeMenuAction(action, { parent: group, caller });
      }
    },
    [group, caller, onAction, closeMenu],
  );

  return (
    <NaturalDropdownMenu.Portal>
      <NaturalDropdownMenu.Content>
        <NaturalDropdownMenu.Viewport>
          {resolvedItems?.map((item) => (
            <MenuContentItem key={item.id} item={item} onClick={handleActionClick} />
          ))}
        </NaturalDropdownMenu.Viewport>
        <NaturalDropdownMenu.Arrow />
      </NaturalDropdownMenu.Content>
    </NaturalDropdownMenu.Portal>
  );
};

//
// Namespace.
//

/**
 * Primary namespace export for the menu system.
 *
 * - `Menu.Root` — context boundary (replaces `MenuProvider`); also provides a dropdown root.
 * - `Menu.Trigger` / `Menu.VirtualTrigger` — dropdown trigger (use with `Menu.Content`).
 * - `Menu.Content` — renders graph-backed dropdown items inside a portal.
 * - `Menu.Toolbar` — flat toolbar component with graph-backed item rendering.
 */
const Menu = {
  Root: MenuRoot,
  Trigger: NaturalDropdownMenu.Trigger,
  Content: MenuContent,
  VirtualTrigger: NaturalDropdownMenu.VirtualTrigger,
  Toolbar: ToolbarMenu,
};

export { Menu, menuContextDefaults, useMenu, useMenuItems, useMenuScoped };

export type { MenuContentProps, MenuRootProps, MenuScopedProps };

export type {
  ToolbarMenuProps,
  ToolbarMenuActionGroupProperties,
  ToolbarMenuActionGroupProps,
  ToolbarMenuActionProps,
  ToolbarMenuDropdownMenuActionGroup,
  ToolbarMenuToggleGroupActionGroup,
} from './ToolbarMenu';
