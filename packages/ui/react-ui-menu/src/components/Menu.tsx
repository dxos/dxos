//
// Copyright 2025 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/unstable/reactivity/Atom';
import React, { type PropsWithChildren, useCallback, useContext, useMemo } from 'react';

import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import { useControllableState } from '@dxos/react-hooks';
import {
  DropdownMenu,
  type DropdownMenuRootProps,
  MenuEntriesProvider,
  type MenuEntryExecutor,
  Toolbar,
  type ToolbarRootProps,
  composable,
  composableProps,
} from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import {
  type AddMenuItemsProps,
  type MenuAction,
  type MenuContextValue,
  type MenuGroupContext,
  type MenuItem,
  type MenuItemsMap,
} from '../types';
import { executeMenuAction, menuEntryNode, toMenuEntry, toMenuGroupEntry } from '../util';
import {
  MenuContextProvider,
  MenuPropsItemsContext,
  menuContextDefaults,
  useMenuItemEntries,
  useMenuScoped,
} from './MenuContext';

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

  // The renderer hands back the plain entry; the node behind it carries the Effect that runs.
  const execute = useCallback<MenuEntryExecutor>(
    (entry, { parent, ...params }) => {
      const action = menuEntryNode(entry) as MenuAction | undefined;
      if (!action) {
        return;
      }
      const invocation: AppGraphNode.InvokeProps = { ...params, parent: parent && menuEntryNode(parent) };
      return onAction ? onAction(action, invocation) : executeMenuAction(action, invocation);
    },
    [onAction],
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
      <MenuEntriesProvider iconSize={iconSize} onAction={execute} useEntries={useMenuItemEntries}>
        {children}
      </MenuEntriesProvider>
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

  return (
    <MenuProvider {...props}>
      <MenuEntriesProvider caller={caller}>
        <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
          {children}
        </DropdownMenu.Root>
      </MenuEntriesProvider>
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

/**
 * Renders the dropdown menu portal, content, and graph-backed items.
 *
 * Must be a descendant of `Menu.Root`. Reads items via `useMenuItems` from the
 * nearest menu context, with optional `group`/`items` prop overrides.
 */
const MenuContent = ({ group, items, caller }: MenuContentProps) => {
  const groupEntry = useMemo(() => group && toMenuGroupEntry(group), [group]);

  const content = (
    <MenuPropsItemsContext.Provider value={items}>
      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Viewport>
            <DropdownMenu.Entries group={groupEntry} />
          </DropdownMenu.Viewport>
          <DropdownMenu.Arrow />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </MenuPropsItemsContext.Provider>
  );

  return caller ? <MenuEntriesProvider caller={caller}>{content}</MenuEntriesProvider> : content;
};

//
// Menu.Toolbar
//

type MenuToolbarProps = ToolbarRootProps;

/**
 * Attention-gated toolbar container with no graph items of its own — render `Menu.Items` among its
 * children, whose JSX order controls where the graph items sit.
 */
const MenuToolbar = composable<HTMLDivElement, MenuToolbarProps>(({ children, ...props }, forwardedRef) => {
  const { attendableId, alwaysActive } = useMenuScoped('MenuToolbar');
  const { hasAttention } = useAttention(attendableId);

  return (
    <Toolbar.Root
      {...composableProps(props, { classNames: attendableId })}
      disabled={!alwaysActive && !hasAttention}
      ref={forwardedRef}
    >
      {children}
    </Toolbar.Root>
  );
});

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
  Trigger: DropdownMenu.Trigger,
  Content: MenuContent,
  VirtualTrigger: DropdownMenu.VirtualTrigger,
  Toolbar: MenuToolbar,
  Items: Toolbar.Entries,
};

export { Menu, toMenuEntry };

export type { MenuContentProps, MenuRootProps, MenuToolbarProps };
