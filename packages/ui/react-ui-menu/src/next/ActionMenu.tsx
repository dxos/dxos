//
// Copyright 2026 DXOS.org
//

import React, {
  type MouseEvent,
  type ReactNode,
  type RefObject,
  cloneElement,
  isValidElement,
  useCallback,
  useMemo,
  useState,
} from 'react';

import { keySymbols } from '@dxos/react-focus';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Next } from '@dxos/react-ui/next';
import { type MenuItemChrome } from '@dxos/ui-types';
import { resolveKeyBinding } from '@dxos/util';

import { translationKey } from '#translations';

import { useMenuActions, useMenuItems } from '../hooks/index.ts';
import {
  type MenuAction,
  type MenuActions,
  type MenuGroupContext,
  type MenuItem,
  type MenuItemGroup,
  isMenuGroup,
  isSeparator,
} from '../types.ts';
import { executeMenuAction } from '../util.ts';
import { iconSizeOf } from './icon-size.ts';

//
// Items (private): the graph's items as `Next.Menu` parts.
//

const isMultiSelect = (group?: MenuGroupContext): boolean => group?.properties?.selectCardinality === 'multiple';

/** An action that declares `checked` is a select-group member (radio, or checkbox in a multi-select group). */
const isCheckable = (item: MenuItem): item is MenuAction =>
  !isSeparator(item) && !isMenuGroup(item) && typeof item.properties?.checked === 'boolean';

/** The row data Next's item parts render: the localized label and the platform's shortcut glyphs. */
const useItemData = (
  id: string,
  properties: Pick<MenuItemChrome, 'label' | 'icon' | 'disabled' | 'keyBinding'>,
): Next.MenuOption => {
  const { t } = useTranslation(translationKey);
  const shortcut = resolveKeyBinding(properties.keyBinding);
  return {
    value: id,
    label: toLocalizedString(properties.label, t),
    icon: properties.icon,
    shortcut: shortcut ? keySymbols(shortcut).join('') : undefined,
    disabled: properties.disabled,
  };
};

/** Runs the action on click, which zag also dispatches for Enter, so keyboard and pointer share one path. */
const useInvoke = (menu: MenuActions, action: MenuAction, group?: MenuGroupContext) => {
  const { onAction, caller } = menu;
  return useCallback(
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
};

type ActionItemProps = {
  menu: MenuActions;
  action: MenuAction;
  group?: MenuGroupContext;
};

const ItemIcon = ({ menu, action }: { menu: MenuActions; action: MenuAction | MenuItemGroup<MenuItemChrome> }) =>
  action.properties?.icon ? (
    <Next.Menu.ItemIcon
      spin={action.properties.spin}
      size={iconSizeOf(menu.iconSize)}
      classNames={action.properties.iconClassNames}
    />
  ) : null;

const ActionMenuItem = ({ menu, action, group }: ActionItemProps) => {
  const item = useItemData(action.id, action.properties);
  const handleClick = useInvoke(menu, action, group);
  return (
    <Next.Menu.Item
      item={item}
      onClick={handleClick}
      // Picking several values from a multi-select group should not close the menu after the first.
      closeOnSelect={!isMultiSelect(group)}
      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
    >
      <ItemIcon menu={menu} action={action} />
      <Next.Menu.ItemText />
      {item.shortcut && <Next.Menu.ItemShortcut />}
    </Next.Menu.Item>
  );
};

const ActionCheckboxItem = ({ menu, action, group }: ActionItemProps) => {
  const item = useItemData(action.id, action.properties);
  const handleClick = useInvoke(menu, action, group);
  return (
    <Next.Menu.CheckboxItem
      item={item}
      // The graph owns the state: the action flips it and the item re-renders from `checked`.
      checked={!!action.properties.checked}
      onClick={handleClick}
      closeOnSelect={false}
      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
    />
  );
};

const ActionRadioItem = ({ menu, action, group }: ActionItemProps) => {
  const item = useItemData(action.id, action.properties);
  const handleClick = useInvoke(menu, action, group);
  return (
    <Next.Menu.RadioItem
      item={item}
      onClick={handleClick}
      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
    />
  );
};

/** A group inside a menu is a submenu; its items resolve when it opens. */
const ActionSubMenu = ({ menu, group }: { menu: MenuActions; group: MenuItemGroup<MenuItemChrome> }) => {
  const item = useItemData(group.id, group.properties);
  return (
    <Next.Menu.Sub>
      <Next.Menu.TriggerItem
        item={item}
        disabled={group.properties.disabled}
        {...(group.properties.testId && { 'data-testid': group.properties.testId })}
      >
        <ItemIcon menu={menu} action={group} />
        <Next.Menu.ItemText />
        <Next.Icon icon='ph--caret-right--regular' />
      </Next.Menu.TriggerItem>
      <Next.Menu.Content>
        <ActionMenuItems menu={menu} group={group} />
      </Next.Menu.Content>
    </Next.Menu.Sub>
  );
};

type Segment = { kind: 'item'; item: MenuItem } | { kind: 'radio'; id: string; actions: MenuAction[] };

/**
 * Runs of checkable items in a single-select group become one radio group (Ark's radio items need one), whose value is
 * the member marked `checked`.
 */
const segment = (items: MenuItem[], multiple: boolean): Segment[] =>
  items.reduce<Segment[]>((segments, item) => {
    const last = segments.at(-1);
    if (multiple || !isCheckable(item)) {
      segments.push({ kind: 'item', item });
    } else if (last?.kind === 'radio') {
      last.actions.push(item);
    } else {
      segments.push({ kind: 'radio', id: item.id, actions: [item] });
    }
    return segments;
  }, []);

const ActionMenuEntry = ({ menu, item, group }: { menu: MenuActions; item: MenuItem; group?: MenuGroupContext }) => {
  if (isSeparator(item)) {
    return <Next.Menu.Separator />;
  }
  if (isMenuGroup(item)) {
    // A graph group's properties are an open record, validated by the plugin that contributed them.
    return <ActionSubMenu menu={menu} group={item as MenuItemGroup<MenuItemChrome>} />;
  }
  const action = item as MenuAction;
  if (action.properties?.hidden) {
    return null;
  }
  return isCheckable(action) ? (
    <ActionCheckboxItem menu={menu} action={action} group={group} />
  ) : (
    <ActionMenuItem menu={menu} action={action} group={group} />
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
  const segments = useMemo(() => segment(items ?? [], isMultiSelect(group)), [items, group]);
  return (
    <>
      {segments.map((entry) =>
        entry.kind === 'radio' ? (
          <Next.Menu.RadioItemGroup
            key={entry.id}
            value={entry.actions.find((action) => action.properties.checked)?.id ?? ''}
          >
            {entry.actions
              .filter((action) => !action.properties.hidden)
              .map((action) => (
                <ActionRadioItem key={action.id} menu={menu} action={action} group={group} />
              ))}
          </Next.Menu.RadioItemGroup>
        ) : (
          <ActionMenuEntry key={entry.item.id} menu={menu} item={entry.item} group={group} />
        ),
      )}
    </>
  );
};

//
// ActionMenu
//

export type ActionMenuProps = Partial<MenuActions> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The group whose items the menu shows; the root's when omitted. */
  group?: MenuGroupContext;
  /**
   * Explicit items in place of the group's own; contributions still apply. A thunk is called once the menu exists, so
   * a deferred menu does not build its items until it is opened.
   */
  actions?: MenuItem[] | (() => MenuItem[]);
  /**
   * Builds the menu on the trigger's first click rather than with the trigger, since each menu carries a state machine
   * and a list renders one per row. Ignored for a controlled or virtually-anchored menu, which may be opened from
   * anywhere and so cannot wait for its own trigger.
   */
  deferUntilOpen?: boolean;
  /** Anchors the content at an element that is not the trigger (open it under control); the child is then optional. */
  virtualRef?: RefObject<Element | null>;
  disabled?: boolean;
  /** Specify a container element to portal the content into. */
  container?: HTMLElement | null;
  /** The trigger. */
  children?: ReactNode;
};

/**
 * A whole `Next.Menu.Root` driven from a `MenuActions`: the child is the trigger (`asChild`), the items come from the
 * graph; groups become `Sub` menus, `checked` members radio or checkbox items. Without a `MenuActions` it is a menu of
 * the explicit `actions` alone.
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
  deferUntilOpen,
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

  const [built, setBuilt] = useState(false);
  const [deferredOpen, setDeferredOpen] = useState(false);
  // Only a menu that owns its open state and renders its own trigger can wait for a click.
  const deferred = !!deferUntilOpen && !virtualRef && open === undefined && defaultOpen === undefined;
  const trigger = isValidElement<{
    'onClick'?: (event: MouseEvent) => void;
    'aria-haspopup'?: 'menu';
    'aria-expanded'?: boolean;
  }>(children)
    ? children
    : undefined;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (deferred) {
        setDeferredOpen(next);
      }
      onOpenChange?.(next);
    },
    [deferred, onOpenChange],
  );

  const handleTriggerClick = useCallback(
    (event: MouseEvent) => {
      trigger?.props.onClick?.(event);
      setBuilt(true);
      handleOpenChange(true);
    },
    [trigger, handleOpenChange],
  );

  // Next's Content portals into a ref.
  const containerRef = useMemo(() => (container ? { current: container } : undefined), [container]);

  const positioning = Next.useVirtualAnchor(virtualRef);

  if (deferred && !built && trigger) {
    return cloneElement(trigger, {
      'onClick': handleTriggerClick,
      // The trigger announces itself as a menu button before the `Menu.Trigger` that would say so exists.
      'aria-haspopup': 'menu',
      'aria-expanded': false,
    });
  }

  return (
    <Next.Menu.Root
      open={deferred ? deferredOpen : open}
      defaultOpen={defaultOpen}
      onOpenChange={({ open }) => handleOpenChange(open)}
      positioning={positioning}
    >
      {children && (
        <Next.Menu.Trigger asChild disabled={disabled}>
          {children}
        </Next.Menu.Trigger>
      )}
      <Next.Menu.Content container={containerRef}>
        <ActionMenuItems menu={menu} group={group} actions={typeof actions === 'function' ? actions() : actions} />
      </Next.Menu.Content>
    </Next.Menu.Root>
  );
};

ActionMenu.displayName = 'ActionMenu';
