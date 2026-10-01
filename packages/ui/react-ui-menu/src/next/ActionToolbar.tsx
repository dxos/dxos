//
// Copyright 2026 DXOS.org
//

import React, { type ButtonHTMLAttributes, forwardRef, useCallback, useMemo, useRef, useState } from 'react';

import { composable, composableProps, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { Next } from '@dxos/react-ui/next';
import { mx } from '@dxos/ui-theme';
import {
  type ClassNameValue,
  type DropdownMenuItemGroupProperties,
  type ToggleGroupMenuItemGroupProperties,
} from '@dxos/ui-types';

import { translationKey } from '#translations';

import { actionLabel } from '../components/action-label.ts';
import { ActionLabel } from '../components/ActionLabel.tsx';
import { useMenuActions, useMenuItems } from '../hooks/index.ts';
import {
  type MenuAction,
  type MenuActions,
  type MenuItem,
  type MenuItemGroup,
  isMenuGroup,
  isSeparator,
} from '../types.ts';
import { executeMenuAction } from '../util.ts';
import { ActionMenu } from './ActionMenu.tsx';

//
// Items (private): the graph's root items as `Next.Toolbar` parts.
//

type ItemProps<T> = { menu: MenuActions } & T;

/** Next's Button has no icon slot, so a spinning icon is styled through the button: its icon is the first child. */
const spinClassNames = (spin?: boolean): ClassNameValue => spin && '[&>svg:first-child]:animate-spin';

type ActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> & {
  action: MenuAction | MenuItemGroup<DropdownMenuItemGroupProperties>;
  variant: Next.ButtonVariant;
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
    const { t } = useTranslation(translationKey);
    const { icon, iconOnly = true, spin } = action.properties;
    const common = {
      ...props,
      classNames: mx(spinClassNames(spin), classNames),
      ...(testId && { 'data-testid': testId }),
      ref: forwardedRef,
    };
    return icon && iconOnly ? (
      <Next.Button {...common} icon={icon} label={actionLabel(action, t)} iconOnly />
    ) : (
      <Next.Button {...common} icon={icon}>
        <ActionLabel action={action} />
      </Next.Button>
    );
  },
);

const ActionToolbarItem = ({ menu, action }: ItemProps<{ action: MenuAction }>) => {
  const { onAction, caller } = menu;
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
      classNames={classNames}
      onClick={handleClick}
      testId={testId}
    />
  );
};

/** A `toggle` action is a pressed button whose state is the action's `checked`. */
const ToggleToolbarItem = ({ menu, action }: ItemProps<{ action: MenuAction }>) => {
  const { onAction, caller } = menu;
  const { t } = useTranslation(translationKey);
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
    classNames: mx(spinClassNames(spin), classNames),
    onPressedChange: handlePressedChange,
    ...(testId && { 'data-testid': testId }),
  };

  return icon && iconOnly ? (
    <Next.Toggle {...common} icon={icon} label={actionLabel(action, t)} iconOnly />
  ) : (
    <Next.Toggle {...common} icon={icon}>
      <ActionLabel action={action} />
    </Next.Toggle>
  );
};

const SwitchToolbarItem = ({ menu, action }: ItemProps<{ action: MenuAction }>) => {
  const { onAction, caller } = menu;
  const { t } = useTranslation(translationKey);
  const { label, iconOnly, disabled, testId, hidden, checked } = action.properties;
  const labelStr = toLocalizedString(label, t);

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
    <Next.Switch
      checked={checked}
      disabled={disabled}
      onCheckedChange={handleCheckedChange}
      {...(iconOnly ? { 'aria-label': labelStr } : { label: labelStr })}
      {...(testId && { 'data-testid': testId })}
    />
  );

  return iconOnly ? (
    <Next.Tooltip.Root>
      <Next.Tooltip.Trigger asChild>{control}</Next.Tooltip.Trigger>
      <Next.Tooltip.Content>{labelStr}</Next.Tooltip.Content>
    </Next.Tooltip.Root>
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
  const { onAction, caller } = menu;
  const { t } = useTranslation(translationKey);
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
    classNames: mx(spinClassNames(spin), classNames),
    onClick: handleClick,
    ...(testId && { 'data-testid': testId }),
  };

  return icon && iconOnly ? (
    <Next.ToggleGroup.Item {...common} icon={icon} label={actionLabel(action, t)} iconOnly />
  ) : (
    <Next.ToggleGroup.Item {...common} icon={icon}>
      <ActionLabel action={action} />
    </Next.ToggleGroup.Item>
  );
};

const ToggleGroupToolbarItem = ({
  menu,
  group,
}: ItemProps<{ group: MenuItemGroup<ToggleGroupMenuItemGroupProperties> }>) => {
  const { t } = useTranslation(translationKey);
  const items = useMenuItems(menu, group);
  const label = toLocalizedString(group.properties.label, t);

  // Only actions render as toggle group items.
  const children = items
    ?.filter((item) => !isSeparator(item) && !isMenuGroup(item))
    .map((item) => <ToggleGroupItem key={item.id} menu={menu} group={group} action={item as MenuAction} />);

  // The group is controlled by the graph: an item's action updates `value`, which flows back in.
  return group.properties.selectCardinality === 'multiple' ? (
    <Next.Toolbar.ToggleGroup type='multiple' value={group.properties.value} aria-label={label}>
      {children}
    </Next.Toolbar.ToggleGroup>
  ) : (
    <Next.Toolbar.ToggleGroup type='single' value={group.properties.value} aria-label={label}>
      {children}
    </Next.Toolbar.ToggleGroup>
  );
};

const ToolbarItem = ({ menu, item }: ItemProps<{ item: MenuItem }>) => {
  if (isSeparator(item)) {
    // Next's separator is only the rule; the `gap` variant is a spacer that pushes what follows to the end.
    return item.properties.variant === 'line' ? (
      <Next.Toolbar.Separator />
    ) : (
      <div role='separator' aria-orientation='vertical' className='grow' />
    );
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
    default:
      return <ActionToolbarItem menu={menu} action={action} />;
  }
};

const ActionToolbarItems = ({ menu }: { menu: MenuActions }) => {
  const items = useMenuItems(menu);
  return (
    <>
      {items?.map((item) => (
        <ToolbarItem key={item.id} menu={menu} item={item} />
      ))}
    </>
  );
};

//
// ActionToolbar
//

export type ActionToolbarProps = Partial<MenuActions> &
  Omit<Next.ToolbarRootProps, 'disabled'> & {
    /** The toolbar is enabled only while this attendable has attention, unless `alwaysActive`. */
    attendableId?: string;
    alwaysActive?: boolean;
  };

/**
 * A whole `Next.Toolbar.Root` driven from a `MenuActions`: the graph's root items render first, then the toolbar's own
 * children. Mix graph and hand-written controls the other way round by dropping an `ActionMenu` into a plain
 * `Next.Toolbar.Root`. Without a `MenuActions` it is an empty toolbar until one arrives.
 */
export const ActionToolbar = composable<HTMLDivElement, ActionToolbarProps>(
  (
    { items, contributions, onAction, caller, iconSize, attendableId, alwaysActive, children, ...props },
    forwardedRef,
  ) => {
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
    const { hasAttention } = useAttention(attendableId);

    return (
      <Next.Toolbar.Root
        {...composableProps(props, { classNames: attendableId })}
        disabled={!alwaysActive && !hasAttention}
        ref={forwardedRef}
      >
        <ActionToolbarItems menu={menu} />
        {children}
      </Next.Toolbar.Root>
    );
  },
);

ActionToolbar.displayName = 'ActionToolbar';
