//
// Copyright 2025 DXOS.org
//

import React, { type MouseEvent, type ReactNode, type RefObject, useCallback, useMemo } from 'react';

import { Icon, Menu, type MenuRootProps } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';
import { type MenuItemChrome } from '@dxos/ui-types';

import { useMenuActions, useMenuItems } from '../hooks';
import {
  type MenuAction,
  type MenuActions,
  type MenuGroupContext,
  type MenuItem,
  type MenuItemGroup,
  isMenuGroup,
  isSeparator,
} from '../types';
import { executeMenuAction } from '../util';
import { ActionLabel } from './ActionLabel';

//
// Items (private): the graph's items as `Menu` parts.
//

const isMultiSelect = (group?: MenuGroupContext): boolean => group?.properties?.selectCardinality === 'multiple';

const ActionMenuItem = ({
  menu,
  action,
  group,
}: {
  menu: MenuActions;
  action: MenuAction;
  group?: MenuGroupContext;
}) => {
  const { onAction, caller, iconSize = 5 } = menu;
  // An item that declares `checked` is a select-group member: expose the checked role + state to AT so
  // the current value is announced, not conveyed by the trailing check icon alone. Mutually-exclusive
  // (single-select) groups use radio semantics; multi-select groups use checkbox.
  const checkable = typeof action.properties?.checked === 'boolean';
  const multiple = isMultiSelect(group);
  const role = multiple ? 'menuitemcheckbox' : 'menuitemradio';

  const handleClick = useCallback(
    (event: MouseEvent) => {
      if (action.properties?.disabled) {
        return;
      }
      event.stopPropagation();
      const params = { parent: group, caller, modifiers: { shift: event.shiftKey } };
      if (onAction) {
        onAction(action, params);
      } else {
        void executeMenuAction(action, params);
      }
    },
    [action, group, caller, onAction],
  );

  // A multi-select group is set by toggling several members, so suppress the primitive's
  // close-on-select; picking one value and closing is single-select behaviour.
  const handleSelect = useCallback((event: Event) => multiple && event.preventDefault(), [multiple]);

  return (
    <Menu.Item
      onClick={handleClick}
      onSelect={handleSelect}
      classNames='gap-2'
      disabled={action.properties?.disabled}
      {...(checkable && { role, 'aria-checked': !!action.properties?.checked })}
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
      {/* Trailing check marks the current value of a single-select group (`checked`). */}
      {action.properties?.checked && <Icon icon='ph--check--regular' size={iconSize} classNames='ms-auto' />}
    </Menu.Item>
  );
};

/** A group inside a menu is a submenu; its items resolve when it opens. */
const ActionSubMenu = ({ menu, group }: { menu: MenuActions; group: MenuItemGroup<MenuItemChrome> }) => {
  const { iconSize = 5 } = menu;
  const { icon, testId } = group.properties;
  return (
    <Menu.Sub>
      <Menu.SubTrigger classNames='gap-2' {...(testId && { 'data-testid': testId })}>
        {icon && <Icon icon={icon} size={iconSize} />}
        <ActionLabel action={group} />
        <Icon icon='ph--caret-right--regular' size={iconSize} classNames='ms-auto' />
      </Menu.SubTrigger>
      <Menu.Portal>
        <Menu.SubContent>
          <Menu.Viewport>
            <ActionMenuItems menu={menu} group={group} />
          </Menu.Viewport>
        </Menu.SubContent>
      </Menu.Portal>
    </Menu.Sub>
  );
};

const ActionMenuItems = ({
  menu,
  group,
  actions,
}: {
  menu: MenuActions;
  group?: MenuGroupContext;
  actions?: MenuItem[];
}) => {
  const items = useMenuItems(menu, group, actions);
  return (
    <>
      {items?.map((item) =>
        isSeparator(item) ? (
          <Menu.Separator key={item.id} />
        ) : isMenuGroup(item) ? (
          // A graph group's properties are an open record, validated by the plugin that contributed them.
          <ActionSubMenu key={item.id} menu={menu} group={item as MenuItemGroup<MenuItemChrome>} />
        ) : (
          <ActionMenuItem key={item.id} menu={menu} action={item as MenuAction} group={group} />
        ),
      )}
    </>
  );
};

//
// ActionMenu
//

export type ActionMenuProps = Partial<MenuActions> &
  Pick<MenuRootProps, 'open' | 'defaultOpen' | 'onOpenChange'> & {
    /** The group whose items the menu shows; the root's when omitted. */
    group?: MenuGroupContext;
    /** Explicit items in place of the group's own; contributions still apply. */
    actions?: MenuItem[];
    /** Anchors the content at an element that is not the trigger; the child is then optional. */
    virtualRef?: RefObject<Element | null>;
    disabled?: boolean;
    /** Specify a container element to portal the content into. */
    container?: HTMLElement | null;
    /** The trigger. */
    children?: ReactNode;
  };

/**
 * A whole `Menu.Root` driven from a `MenuActions`: the child is the trigger, the items come from the
 * graph. Being complete, it drops into a hand-written `Toolbar.Root` beside plain buttons. Without a
 * `MenuActions` it is a menu of the explicit `actions` alone.
 */
export const ActionMenu = ({
  items,
  contributions,
  onAction,
  caller,
  iconSize,
  group,
  actions,
  virtualRef,
  disabled,
  container,
  open,
  defaultOpen,
  onOpenChange,
  children,
}: ActionMenuProps) => {
  // Called unconditionally (hooks), used only when no source was spread in.
  const standalone = useMenuActions();
  const menu = useMemo<MenuActions>(
    () => ({
      items: items ?? standalone.items,
      contributions: contributions ?? standalone.contributions,
      onAction,
      caller,
      iconSize,
    }),
    [items, contributions, onAction, caller, iconSize, standalone],
  );

  return (
    <Menu.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
      {virtualRef ? <Menu.VirtualTrigger virtualRef={virtualRef} /> : null}
      {children && (
        <Menu.Trigger asChild disabled={disabled}>
          {children}
        </Menu.Trigger>
      )}
      <Menu.Portal container={container}>
        <Menu.Content>
          <Menu.Viewport>
            <ActionMenuItems menu={menu} group={group} actions={actions} />
          </Menu.Viewport>
          <Menu.Arrow />
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
};

ActionMenu.displayName = 'ActionMenu';
