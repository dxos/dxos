//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { type MouseEvent, type PropsWithChildren, useCallback, useContext, useMemo } from 'react';

import { useControllableState } from '@dxos/react-hooks';
import { type DropdownMenuRootProps, Icon, DropdownMenu as NaturalDropdownMenu } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import {
  type AddMenuItemsProps,
  type MenuAction,
  type MenuContextValue,
  type MenuGroupContext,
  type MenuItem,
  type MenuItemsMap,
  isSeparator,
} from '../types';
import { executeMenuAction } from '../util';
import { ActionLabel } from './ActionLabel';
import {
  MenuContextProvider,
  MenuDropdownContext,
  menuContextDefaults,
  useMenuItems,
  useMenuScoped,
} from './MenuContext';
import { ToolbarMenu, ToolbarMenuItems } from './ToolbarMenu';

//
// MenuProvider (internal) — the context provider used by Menu.Root.
//

const DEFAULT_PRIORITY = 100;

type MenuProviderProps = PropsWithChildren<Partial<MenuContextValue>>;

const MenuProvider = ({
  children,
  items = menuContextDefaults.items,
  iconSize = menuContextDefaults.iconSize,
  attendableId,
  alwaysActive,
  onAction,
}: MenuProviderProps) => {
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
    >
      {children}
    </MenuContextProvider>
  );
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
  group?: MenuGroupContext;
  items?: MenuItem[];
  caller?: string;
};

const MenuContentItem = ({
  item,
  onClick,
}: {
  item: MenuItem;
  onClick: (action: MenuAction, event: MouseEvent) => void;
}) => {
  const action = item as MenuAction;
  const handleClick = useCallback((event: MouseEvent) => onClick(action, event), [action, onClick]);
  const { iconSize } = useMenuScoped('MenuContentItem');
  return (
    <NaturalDropdownMenu.Item
      onClick={handleClick}
      classNames='gap-2'
      disabled={action.properties?.disabled}
      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
    >
      {action.properties?.icon && (
        <Icon
          icon={action.properties.icon}
          size={iconSize}
          classNames={mx(action.properties.spin && 'animate-spin', action.properties.iconClassNames)}
        />
      )}
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
const MenuContent = ({ group, items: propsItems, caller: callerOverride }: MenuContentProps) => {
  const { closeMenu, caller: contextCaller } = useContext(MenuDropdownContext);
  const caller = callerOverride ?? contextCaller;
  const { onAction } = useMenuScoped('MenuContent');
  const resolvedItems = useMenuItems(group, propsItems, 'MenuContent');

  const handleActionClick = useCallback(
    (action: MenuAction, event: MouseEvent) => {
      if (action.properties?.disabled) {
        return;
      }
      event.stopPropagation();
      closeMenu();
      const params = { parent: group, caller, modifiers: { shift: event.shiftKey } };
      if (onAction) {
        onAction(action, params);
      } else {
        void executeMenuAction(action, params);
      }
    },
    [group, caller, onAction, closeMenu],
  );

  return (
    <NaturalDropdownMenu.Portal>
      <NaturalDropdownMenu.Content>
        <NaturalDropdownMenu.Viewport>
          {resolvedItems?.map((item) =>
            isSeparator(item) ? (
              <NaturalDropdownMenu.Separator key={item.id} />
            ) : (
              <MenuContentItem key={item.id} item={item} onClick={handleActionClick} />
            ),
          )}
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
 * - `Menu.Toolbar` — attention-gated toolbar container; renders only its children.
 * - `Menu.Items` — the graph-backed toolbar items; place it among `Menu.Toolbar`'s children,
 *   whose JSX order controls where the items sit.
 */
const Menu = {
  Root: MenuRoot,
  Trigger: NaturalDropdownMenu.Trigger,
  Content: MenuContent,
  VirtualTrigger: NaturalDropdownMenu.VirtualTrigger,
  Toolbar: ToolbarMenu,
  Items: ToolbarMenuItems,
};

export { Menu };

export type { MenuContentProps, MenuRootProps };

export type {
  ToolbarMenuActionGroupProperties,
  ToolbarMenuActionGroupProps,
  ToolbarMenuActionProps,
  ToolbarMenuDropdownMenuActionGroup,
  ToolbarMenuProps,
  ToolbarMenuToggleGroupActionGroup,
} from './ToolbarMenu';
