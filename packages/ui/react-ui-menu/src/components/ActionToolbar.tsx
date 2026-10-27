//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Atom from 'effect/reactivity/Atom';
import React, {
  type ButtonHTMLAttributes,
  type ForwardedRef,
  Fragment,
  type RefObject,
  forwardRef,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useAttention } from '@dxos/react-ui-attention';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';
import * as Theme from '@dxos/react-ui/Theme';
import * as ToggleGroup from '@dxos/react-ui/ToggleGroup';
import * as Toolbar from '@dxos/react-ui/Toolbar';
import * as Tooltip from '@dxos/react-ui/Tooltip';
import * as Util from '@dxos/react-ui/Util';
import {
  type ClassNameValue,
  type DropdownMenuItemGroupProperties,
  type ToggleGroupMenuItemGroupProperties,
  TOOLBAR_OVERFLOW_TESTID,
  type ToolbarPlacement,
  type ToolbarZone,
} from '@dxos/ui-types';

import { translationKey } from '#translations';

import { TOOLBAR_OVERFLOW_ID, defaultOverflowGroup } from '../builder.ts';
import { type ActionGraphProps, useMenuActions, useMenuItems } from '../hooks/index.ts';
import {
  type MenuAction,
  type MenuActions,
  type MenuItem,
  type MenuItemGroup,
  type MenuItemsAccessor,
  isMenuGroup,
  isSeparator,
} from '../types.ts';
import { executeMenuAction } from '../util.ts';
import { actionLabel } from './action-label.ts';
import { ActionLabel } from './ActionLabel.tsx';
import { ActionMenu } from './ActionMenu.tsx';

//
// Items (private): the graph's root items as `Toolbar` parts.
//

type ItemProps<T> = { menu: MenuActions } & T;

type ActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> & {
  action: MenuAction | MenuItemGroup<DropdownMenuItemGroupProperties>;
  variant: Button.Variant;
  iconSize?: Util.Size;
  caretDown?: boolean;
  classNames?: ClassNameValue;
  testId?: string;
};

/**
 * An action as a Next Button: icon-only with its label (and shortcut) in a tooltip, or text with a trailing shortcut.
 * Forwards its ref and remaining props, since a `Menu.Trigger asChild` merges the trigger's onto it.
 */
const ActionButton = forwardRef<HTMLButtonElement, ActionButtonProps>(
  ({ action, classNames, testId, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(translationKey);
    const { icon, iconOnly = true, spin } = action.properties;
    const common = {
      ...props,
      spin,
      classNames,
      ...(testId && { 'data-testid': testId }),
      ref: forwardedRef,
    };
    return icon && iconOnly ? (
      <Button.Root {...common} icon={icon} label={actionLabel(action, t)} iconOnly />
    ) : (
      <Button.Root {...common} icon={icon}>
        <ActionLabel action={action} />
      </Button.Root>
    );
  },
);

const ActionToolbarItem = ({ menu, action }: ItemProps<{ action: MenuAction }>) => {
  const { onAction, caller, iconSize } = menu;
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const { disabled, testId, hidden, classNames } = action.properties;

  // One invocation at a time: the button is disabled until the last one settles.
  const handleClick = useCallback(() => {
    if (pendingRef.current) {
      return;
    }
    pendingRef.current = true;
    setPending(true);
    const done = () => {
      pendingRef.current = false;
      setPending(false);
    };
    if (onAction) {
      Promise.resolve(onAction(action, { caller })).then(done, done);
    } else {
      executeMenuAction(action, { caller }).then(done, done);
    }
  }, [action, caller, onAction]);

  if (hidden) {
    return null;
  }

  return (
    <ActionButton
      action={action}
      variant={action.properties.variant === 'primary' ? 'primary' : 'ghost'}
      disabled={disabled || pending}
      iconSize={iconSize}
      classNames={classNames}
      onClick={handleClick}
      testId={testId}
    />
  );
};

/** A `toggle` action is a pressed button whose state is the action's `checked`. */
const ToggleToolbarItem = ({ menu, action }: ItemProps<{ action: MenuAction }>) => {
  const { onAction, caller, iconSize } = menu;
  const { t } = Hooks.useTranslation(translationKey);
  const { icon, iconOnly = true, disabled, testId, hidden, checked, classNames, spin } = action.properties;

  const handlePressedChange = useCallback(() => {
    if (onAction) {
      onAction(action, { caller });
    } else {
      void executeMenuAction(action, { caller });
    }
  }, [action, caller, onAction]);

  if (hidden) {
    return null;
  }

  const common = {
    variant: 'ghost' as const,
    pressed: !!checked,
    disabled,
    spin,
    iconSize: iconSize,
    classNames,
    onPressedChange: handlePressedChange,
    ...(testId && { 'data-testid': testId }),
  };

  return icon && iconOnly ? (
    <Button.Toggle {...common} icon={icon} label={actionLabel(action, t)} iconOnly />
  ) : (
    <Button.Toggle {...common} icon={icon}>
      <ActionLabel action={action} />
    </Button.Toggle>
  );
};

const SwitchToolbarItem = ({ menu, action }: ItemProps<{ action: MenuAction }>) => {
  const { onAction, caller } = menu;
  const { t } = Hooks.useTranslation(translationKey);
  const { label, iconOnly, disabled, testId, hidden, checked } = action.properties;
  const labelStr = Theme.toLocalizedString(label, t);

  const handleCheckedChange = useCallback(() => {
    if (onAction) {
      onAction(action, { caller });
    } else {
      void executeMenuAction(action, { caller });
    }
  }, [action, caller, onAction]);

  if (hidden) {
    return null;
  }

  const control = (
    <Input.Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={handleCheckedChange}
      {...(iconOnly ? { 'aria-label': labelStr } : { label: labelStr })}
      {...(testId && { 'data-testid': testId })}
    />
  );

  return iconOnly ? (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{control}</Tooltip.Trigger>
      <Tooltip.Content>{labelStr}</Tooltip.Content>
    </Tooltip.Root>
  ) : (
    control
  );
};

const DropdownToolbarItem = ({ menu, group }: ItemProps<{ group: MenuItemGroup<DropdownMenuItemGroupProperties> }>) => {
  const items = useMenuItems(menu, group);
  const { disabled, testId, applyActive, caretDown = true } = group.properties;
  const activeItem = items?.find((item) => !!(item as MenuAction).properties.checked) as MenuAction | undefined;

  // With `applyActive` the trigger shows the active child's icon, accent and label in place of the group's.
  const display = useMemo<MenuItemGroup<DropdownMenuItemGroupProperties>>(() => {
    if (!applyActive || !activeItem) {
      return group;
    }
    const { icon, iconClassNames, spin, label, keyBinding } = activeItem.properties;
    return {
      ...group,
      properties: {
        ...group.properties,
        icon: icon || group.properties.icon,
        iconClassNames: iconClassNames || group.properties.iconClassNames,
        spin: spin || group.properties.spin,
        label,
        keyBinding,
      },
    };
  }, [group, applyActive, activeItem]);

  const trigger = (
    <ActionButton
      action={display}
      variant='ghost'
      disabled={disabled}
      iconSize={menu.iconSize}
      caretDown={caretDown && !disabled}
      testId={testId}
    />
  );

  // No menu behind a disabled trigger, since `disabled` alone does not gate the machine's open handler.
  if (disabled) {
    return trigger;
  }

  return (
    <ActionMenu {...menu} group={group} actions={items}>
      {trigger}
    </ActionMenu>
  );
};

const ToggleGroupItem = ({
  menu,
  group,
  action,
}: ItemProps<{ group: MenuItemGroup<ToggleGroupMenuItemGroupProperties>; action: MenuAction }>) => {
  const { onAction, caller, iconSize } = menu;
  const { t } = Hooks.useTranslation(translationKey);
  const { icon, iconOnly = true, disabled, testId, hidden, classNames, spin } = action.properties;

  const handleClick = useCallback(() => {
    if (onAction) {
      onAction(action, { parent: group, caller });
    } else {
      void executeMenuAction(action, { parent: group, caller });
    }
  }, [action, group, caller, onAction]);

  if (hidden) {
    return null;
  }

  const common = {
    value: action.id,
    disabled,
    variant: 'ghost' as const,
    spin,
    iconSize: iconSize,
    classNames,
    onClick: handleClick,
    ...(testId && { 'data-testid': testId }),
  };

  return icon && iconOnly ? (
    <ToggleGroup.Item {...common} icon={icon} label={actionLabel(action, t)} iconOnly />
  ) : (
    <ToggleGroup.Item {...common} icon={icon}>
      <ActionLabel action={action} />
    </ToggleGroup.Item>
  );
};

const ToggleGroupToolbarItem = ({
  menu,
  group,
}: ItemProps<{ group: MenuItemGroup<ToggleGroupMenuItemGroupProperties> }>) => {
  const { t } = Hooks.useTranslation(translationKey);
  const items = useMenuItems(menu, group);
  const label = Theme.toLocalizedString(group.properties.label, t);

  // Only actions render as toggle group items.
  const children = items
    ?.filter((item) => !isSeparator(item) && !isMenuGroup(item))
    .map((item) => <ToggleGroupItem key={item.id} menu={menu} group={group} action={item as MenuAction} />);

  // The group is controlled by the graph: an item's action updates `value`, which flows back in.
  return group.properties.selectCardinality === 'multiple' ? (
    <Toolbar.ToggleGroup type='multiple' value={group.properties.value} aria-label={label}>
      {children}
    </Toolbar.ToggleGroup>
  ) : (
    <Toolbar.ToggleGroup type='single' value={group.properties.value} aria-label={label}>
      {children}
    </Toolbar.ToggleGroup>
  );
};

const TextToolbarItem = ({ action }: { action: MenuAction }) => {
  const { t } = Hooks.useTranslation(translationKey);
  const { label, hidden, testId, classNames } = action.properties;
  if (hidden) {
    return null;
  }
  return (
    <Toolbar.Text classNames={classNames} {...(testId && { 'data-testid': testId })}>
      {Theme.toLocalizedString(label, t)}
    </Toolbar.Text>
  );
};

/** One menu item rendered as its toolbar control (button, toggle, switch, dropdown, toggle group or custom). */
export const MenuToolbarItem = ({ menu, item }: ItemProps<{ item: MenuItem }>) => {
  if (isSeparator(item)) {
    return <Toolbar.Separator variant={item.properties.variant === 'line' ? 'line' : 'gap'} />;
  }

  if (isMenuGroup(item)) {
    return item.properties.variant === 'dropdownMenu' ? (
      <DropdownToolbarItem menu={menu} group={item as MenuItemGroup<DropdownMenuItemGroupProperties>} />
    ) : (
      <ToggleGroupToolbarItem menu={menu} group={item as MenuItemGroup<ToggleGroupMenuItemGroupProperties>} />
    );
  }

  const action = item as MenuAction;
  switch (action.properties?.variant) {
    case 'switch':
      return <SwitchToolbarItem menu={menu} action={action} />;
    case 'toggle':
      return <ToggleToolbarItem menu={menu} action={action} />;
    case 'custom':
      // The contributor owns the rendered element (interactions the action model cannot express).
      return action.properties.render ? <>{action.properties.render()}</> : null;
    case 'text':
      return <TextToolbarItem action={action} />;
    default:
      return <ActionToolbarItem menu={menu} action={action} />;
  }
};

//
// Layout (private): zones, rows and the overflow menu.
//

const ZONES: readonly ToolbarZone[] = ['start', 'end'];

const placementOf = (item: MenuItem): ToolbarPlacement => (isSeparator(item) ? {} : (item.properties.placement ?? {}));

/** A named group without a render variant: inline in a toolbar, a submenu in a menu. */
const isPlainGroup = (item: MenuItem): item is MenuItemGroup => isMenuGroup(item) && !item.properties.variant;

/** Sorts by `placement.order`, an item without one keeping its insertion index. */
const byOrder = (items: readonly MenuItem[]): MenuItem[] =>
  items
    .map((item, index) => ({ item, order: placementOf(item).order ?? index }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item);

/** Drops separators left leading, trailing or doubled once items are placed elsewhere. */
const trimSeparators = (items: readonly MenuItem[]): MenuItem[] =>
  items.filter(
    (item, index) => !isSeparator(item) || (index > 0 && index < items.length - 1 && !isSeparator(items[index + 1])),
  );

/** A named group laid out inline, its own and contributed items in order; ruled off from what precedes it. */
const InlineGroup = ({ menu, group, separated }: ItemProps<{ group: MenuItemGroup; separated: boolean }>) => {
  const items = useMenuItems(menu, group);
  const ordered = useMemo(() => byOrder(items ?? []), [items]);
  if (ordered.length === 0) {
    return null;
  }
  return (
    <>
      {separated && <Toolbar.Separator variant='line' />}
      {ordered.map((item) => (
        <MenuToolbarItem key={item.id} menu={menu} item={item} />
      ))}
    </>
  );
};

/** The ⋮ menu: groups collapsed out of the rows (as submenus), then the overflow group's own and contributed items. */
const OverflowMenu = ({ menu, group, collapsed }: ItemProps<{ group: MenuItemGroup; collapsed: MenuItem[] }>) => {
  const items = useMenuItems(menu, group);
  const actions = useMemo(() => [...collapsed, ...byOrder(items ?? [])], [collapsed, items]);
  return <OverflowMenuTrigger menu={menu} actions={actions} testId={group.properties.testId} />;
};

const OverflowMenuTrigger = ({ menu, actions, testId }: ItemProps<{ actions: MenuItem[]; testId?: string }>) => {
  const { t } = Hooks.useTranslation(translationKey);
  if (actions.length === 0) {
    return null;
  }
  return (
    <ActionMenu {...menu} actions={actions}>
      <Button.Root
        data-testid={testId ?? TOOLBAR_OVERFLOW_TESTID}
        icon='ph--dots-three-vertical--regular'
        iconOnly
        variant='ghost'
        label={t('toolbar-overflow.menu')}
      />
    </ActionMenu>
  );
};

/** The element a row lays out in: the `Toolbar.Root` scroll frame around it, else the row itself. */
const frameOf = (row: HTMLElement): HTMLElement =>
  row.parentElement?.classList.contains('dx-toolbar-scroll') ? row.parentElement : row;

/** A menu cannot show a control the contributor renders itself, or a label, so such items never leave the row. */
const isMenuable = (item: MenuItem): boolean =>
  !isSeparator(item) && item.properties.variant !== 'custom' && item.properties.variant !== 'text';

/**
 * Moves items into the overflow menu while any row is too narrow, so the toolbar fills its container without
 * overflowing it: ranked items first (highest rank first), then the rest, last first. Each comes back once the toolbar
 * is wider than when it collapsed, so hidden items are never measured.
 */
const useCollapse = (menu: MenuActions, units: MenuItem[], rows: RefObject<(HTMLElement | null)[]>): MenuItem[] => {
  const registry = useContext(RegistryContext);
  const collapsible = useMemo(() => {
    // A named group collapses as a submenu, which can only hold what a menu shows; an empty one takes no room to free.
    const canCollapse = (item: MenuItem) => {
      if (!isMenuable(item)) {
        return false;
      }
      if (!isPlainGroup(item)) {
        return true;
      }
      const children = registry.get(menu.items(item)) ?? [];
      return children.length > 0 && children.every(isMenuable);
    };
    const ranked = units
      .map((item, index) => ({ item, rank: placementOf(item).collapse, index }))
      .filter(({ item, rank }) => rank !== undefined && canCollapse(item))
      .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0) || b.index - a.index)
      .map(({ item }) => item);
    const rest = units.filter((item) => placementOf(item).collapse === undefined && canCollapse(item)).reverse();
    return [...ranked, ...rest];
  }, [registry, menu, units]);

  const [count, setCount] = useState(0);
  const thresholds = useRef<number[]>([]);
  const [width, setWidth] = useState(0);
  // Ids rather than the items: `collapsible` is rebuilt whenever a caller passes a fresh `onAction`.
  const collapsibleKey = collapsible.map((item) => item.id).join('\n');

  // Each read forces a layout, so measure only when the items (a new label or icon-only flag yields new items), the
  // collapsible set, the collapse count or the frame width moved.
  useLayoutEffect(() => {
    if (collapsible.length === 0 && count === 0) {
      return;
    }
    const elements = rows.current.filter((row): row is HTMLElement => !!row);
    if (elements.length === 0) {
      return;
    }
    const width = frameOf(elements[0]).clientWidth;
    // A toolbar not laid out yet (a closed drawer, a hidden panel) has no width to fit; it is measured once it has one.
    if (width === 0) {
      return;
    }
    const overflowing = elements.some((row) => row.scrollWidth > row.clientWidth + 1);
    if (overflowing && count < collapsible.length) {
      thresholds.current[count] = width;
      setCount(count + 1);
    } else if (!overflowing && count > 0 && width > (thresholds.current[count - 1] ?? Infinity)) {
      setCount(count - 1);
    }
  }, [units, collapsibleKey, count, width]);

  // Re-render on resize only when something can collapse.
  const observed = collapsible.length > 0;
  useLayoutEffect(() => {
    const element = rows.current[0];
    if (!observed || !element) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(frameOf(element));
    return () => observer.disconnect();
  }, [observed, rows]);

  return useMemo(() => collapsible.slice(0, count), [collapsible, count]);
};

const setRef = <T,>(ref: ForwardedRef<T>, value: T | null) => {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
};

//
// ActionToolbar
//

/** Each group's items from `base`, then from `extra`, so a second graph extends the first group by group. */
const mergeItems = (base: MenuItemsAccessor, extra: MenuItemsAccessor): MenuItemsAccessor => {
  const atoms = new Map<string, Atom.Atom<MenuItem[] | null>>();
  return (group) => {
    const key = group?.id ?? '';
    let atom = atoms.get(key);
    if (!atom) {
      atom = Atom.make((get) => {
        const own = get(base(group));
        const added = get(extra(group));
        return own || added ? [...(own ?? []), ...(added ?? [])] : null;
      });
      atoms.set(key, atom);
    }
    return atom;
  };
};

export type ActionToolbarProps = Partial<MenuActions> &
  Omit<Toolbar.RootProps, 'disabled' | 'children'> & {
    /** The toolbar is dimmed (still operable) while this attendable lacks attention, unless `alwaysActive`. */
    attendableId?: string;
    alwaysActive?: boolean;
    /**
     * Items another component adds to this toolbar, merged with its own group by group: root items follow the owner's,
     * and `MenuBuilder.extend(groupId, …)` adds to a named group.
     */
    customActions?: Atom.Atom<ActionGraphProps>;
  };

/**
 * A toolbar driven from a `MenuActions`. Each item's `placement` puts it in the start or end zone of a row; a
 * plain named group renders inline and others extend it (`MenuBuilder.extend`); the overflow menu (⋮,
 * `TOOLBAR_OVERFLOW_ID`) ends the first row and takes collapsible items while a row is too narrow. One row renders as a
 * single `Toolbar.Root` (which takes the props and ref); more stack one per row. Hand-written controls join the graph as
 * `custom` items (`MenuBuilder.custom`), labels as `text` items.
 */
export const ActionToolbar = Util.composable<HTMLDivElement, ActionToolbarProps>(
  (
    // Controls join the graph as `custom` items, so `children` are dropped rather than rendered.
    {
      items,
      contributions,
      onAction,
      caller,
      iconSize,
      attendableId,
      alwaysActive,
      customActions,
      children: _,
      ...props
    },
    forwardedRef,
  ) => {
    // Called unconditionally (hooks), used only when no source was spread in.
    const standalone = useMenuActions();
    const custom = useMenuActions(customActions);
    const menu = useMemo<MenuActions>(
      () => ({
        items: customActions ? mergeItems(items ?? standalone.items, custom.items) : (items ?? standalone.items),
        contributions: contributions ?? standalone.contributions,
        onAction,
        caller,
        iconSize,
      }),
      [items, contributions, onAction, caller, iconSize, standalone, customActions, custom],
    );
    const { hasAttention } = useAttention(attendableId);

    const rootItems = useMenuItems(menu);
    const overflow =
      rootItems?.find((item): item is MenuItemGroup => isMenuGroup(item) && item.id === TOOLBAR_OVERFLOW_ID) ??
      defaultOverflowGroup;
    const units = useMemo(() => (rootItems ?? []).filter((item) => item.id !== TOOLBAR_OVERFLOW_ID), [rootItems]);
    const rows = useRef<(HTMLElement | null)[]>([]);
    const collapsed = useCollapse(menu, units, rows);

    const rowCount = Math.max(1, ...units.map((item) => (placementOf(item).row ?? 0) + 1));
    const zone = (row: number, zone: ToolbarZone) =>
      trimSeparators(
        byOrder(
          units.filter((item) => {
            const placement = placementOf(item);
            return (placement.row ?? 0) === row && (placement.zone ?? 'start') === zone && !collapsed.includes(item);
          }),
        ),
      );

    const renderRow = (row: number) => {
      const zones = ZONES.map((name) => ({ name, items: zone(row, name) }));
      const first = row === 0;
      return (
        <Toolbar.Root
          key={row}
          {...(first ? Util.composableProps(props, { classNames: attendableId }) : { classNames: props.classNames })}
          data-row={rowCount > 1 ? row : undefined}
          inactive={!alwaysActive && !hasAttention}
          ref={(element: HTMLDivElement | null) => {
            rows.current[row] = element;
            first && setRef(forwardedRef, element);
          }}
        >
          {zones.map(({ name, items }, index) => (
            <Fragment key={name}>
              {/* A gap pushes the end zone to the far right. */}
              {index > 0 && items.length > 0 && <Toolbar.Separator variant='gap' />}
              {items.map((item, index) =>
                isPlainGroup(item) ? (
                  <InlineGroup key={item.id} menu={menu} group={item} separated={index > 0} />
                ) : (
                  <MenuToolbarItem key={item.id} menu={menu} item={item} />
                ),
              )}
            </Fragment>
          ))}
          {first && <OverflowMenu menu={menu} group={overflow} collapsed={collapsed} />}
        </Toolbar.Root>
      );
    };

    return rowCount === 1 ? (
      renderRow(0)
    ) : (
      <div role='none' className='flex flex-col w-full min-w-0 min-h-fit'>
        {Array.from({ length: rowCount }, (_, row) => renderRow(row))}
      </div>
    );
  },
);

ActionToolbar.displayName = 'ActionToolbar';
