//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo, useRef, useState } from 'react';

import {
  Field,
  Toolbar,
  type ToolbarRootProps,
  Tooltip,
  composable,
  composableProps,
  toLocalizedString,
  useTranslation,
} from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { mx } from '@dxos/ui-theme';
import { type DropdownMenuItemGroupProperties, type ToggleGroupMenuItemGroupProperties } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { useMenuActions, useMenuItems } from '../hooks';
import {
  type MenuAction,
  type MenuActions,
  type MenuItem,
  type MenuItemGroup,
  isMenuGroup,
  isSeparator,
} from '../types';
import { executeMenuAction } from '../util';
import { actionLabel } from './action-label';
import { ActionLabel } from './ActionLabel';
import { ActionMenu } from './ActionMenu';

//
// Items (private): the graph's root items as `Toolbar` parts.
//

type ItemProps<T> = { menu: MenuActions } & T;

const ActionToolbarItem = ({ menu, action }: ItemProps<{ action: MenuAction }>) => {
  const { onAction, caller, iconSize = 5 } = menu;
  const { t } = useTranslation(translationKey);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const { icon, iconOnly = true, disabled, testId, hidden, classNames, iconClassNames, spin } = action.properties;
  const buttonVariant = action.properties.variant === 'primary' ? ('primary' as const) : ('ghost' as const);

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

  const commonProps = {
    variant: buttonVariant,
    disabled: disabled || pending,
    classNames,
    onClick: handleClick,
    ...(testId && { 'data-testid': testId }),
  };

  return icon ? (
    <Toolbar.IconButton
      {...commonProps}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      iconClassNames={mx(spin && 'animate-spin', iconClassNames)}
      label={actionLabel(action, t)}
    />
  ) : (
    <Toolbar.Button {...commonProps}>
      <ActionLabel action={action} />
    </Toolbar.Button>
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

  const switchInput = (
    <Field.Switch
      checked={checked}
      disabled={disabled}
      aria-label={iconOnly ? labelStr : undefined}
      onCheckedChange={handleCheckedChange}
      {...(testId && { 'data-testid': testId })}
    />
  );

  return (
    <Field.Root>
      {iconOnly ? (
        <Tooltip.Trigger asChild content={labelStr}>
          <Field.Block>{switchInput}</Field.Block>
        </Tooltip.Trigger>
      ) : (
        <Field.Block>{switchInput}</Field.Block>
      )}
      {!iconOnly && <Field.Label>{labelStr}</Field.Label>}
    </Field.Root>
  );
};

const DropdownToolbarItem = ({ menu, group }: ItemProps<{ group: MenuItemGroup<DropdownMenuItemGroupProperties> }>) => {
  const { t } = useTranslation(translationKey);
  const { iconSize = 5 } = menu;
  const items = useMenuItems(menu, group);
  const {
    iconOnly,
    disabled,
    testId,
    applyActive,
    caretDown = true,
    icon: groupIcon,
    iconClassNames: groupIconClassNames,
    spin: groupSpin,
  } = group.properties;
  const activeItem = items?.find((item) => !!(item as MenuAction).properties.checked) as MenuAction | undefined;
  const icon = (applyActive && activeItem?.properties.icon) || groupIcon;
  // Follow the same `applyActive` rule for `iconClassNames` so a per-item accent (e.g. tag colour) tracks the displayed icon.
  const iconClassNames = (applyActive && activeItem?.properties.iconClassNames) || groupIconClassNames;
  const spin = (applyActive && activeItem?.properties.spin) || groupSpin;
  const labelAction = applyActive && activeItem ? activeItem : group;

  const trigger = icon ? (
    <Toolbar.IconButton
      variant='ghost'
      disabled={disabled}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      iconClassNames={mx(spin && 'animate-spin', iconClassNames)}
      label={actionLabel(labelAction, t)}
      caretDown={caretDown && !disabled}
      {...(testId && { 'data-testid': testId })}
    />
  ) : (
    <Toolbar.Button
      variant='ghost'
      disabled={disabled}
      caretDown={caretDown && !disabled}
      {...(testId && { 'data-testid': testId })}
    >
      <ActionLabel action={labelAction} />
    </Toolbar.Button>
  );

  // No menu behind a disabled trigger, since `disabled` alone does not gate the machine's open handler and the
  // group presented an empty dropdown.
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
  const { onAction, caller, iconSize = 5 } = menu;
  const { t } = useTranslation(translationKey);
  const { icon, iconOnly = true, disabled, testId, hidden, classNames, iconClassNames, spin } = action.properties;

  const handleClick = useCallback(() => {
    if (onAction) {
      onAction(action, { parent: group, caller });
    } else {
      void executeMenuAction(action, { parent: group, caller });
    }
  }, [action, group, caller, onAction]);

  const commonProps = {
    value: action.id,
    disabled,
    variant: 'ghost' as const,
    classNames,
    onClick: handleClick,
    ...(testId && { 'data-testid': testId }),
  };

  return hidden ? null : icon ? (
    <Toolbar.ToggleGroupIconItem
      {...commonProps}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      iconClassNames={mx(spin && 'animate-spin', iconClassNames)}
      label={actionLabel(action, t)}
    />
  ) : (
    <Toolbar.ToggleGroupItem {...commonProps}>
      <ActionLabel action={action} />
    </Toolbar.ToggleGroupItem>
  );
};

const ToggleGroupToolbarItem = ({
  menu,
  group,
}: ItemProps<{ group: MenuItemGroup<ToggleGroupMenuItemGroupProperties> }>) => {
  const items = useMenuItems(menu, group);
  const { selectCardinality } = group.properties;

  // TODO(thure): Handle other menu item types.
  const children = (items as MenuAction[] | undefined)?.map((action) => (
    <ToggleGroupItem key={action.id} menu={menu} group={group} action={action} />
  ));

  return selectCardinality === 'multiple' ? (
    <Toolbar.ToggleGroup type='multiple' value={group.properties.value}>
      {children}
    </Toolbar.ToggleGroup>
  ) : (
    <Toolbar.ToggleGroup type='single' value={group.properties.value}>
      {children}
    </Toolbar.ToggleGroup>
  );
};

const ToolbarItem = ({ menu, item }: ItemProps<{ item: MenuItem }>) => {
  if (isSeparator(item)) {
    return <Toolbar.Separator variant={item.properties.variant} />;
  }

  if (isMenuGroup(item)) {
    return item.properties.variant === 'dropdownMenu' ? (
      <DropdownToolbarItem menu={menu} group={item as MenuItemGroup<DropdownMenuItemGroupProperties>} />
    ) : (
      <ToggleGroupToolbarItem menu={menu} group={item as MenuItemGroup<ToggleGroupMenuItemGroupProperties>} />
    );
  }

  const action = item as MenuAction;
  if (action.properties?.variant === 'switch') {
    return <SwitchToolbarItem menu={menu} action={action} />;
  }

  // The contributor owns the rendered element (interactions the action model cannot express).
  if (action.properties?.variant === 'custom' && action.properties.render) {
    return <>{action.properties.render()}</>;
  }

  return <ActionToolbarItem menu={menu} action={action} />;
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
  ToolbarRootProps & {
    /** The toolbar is enabled only while this attendable has attention, unless `alwaysActive`. */
    attendableId?: string;
    alwaysActive?: boolean;
  };

/**
 * A whole `Toolbar.Root` driven from a `MenuActions`: the graph's root items render first, then the
 * toolbar's own children. Mix graph and hand-written controls the other way round by dropping an
 * `ActionMenu` into a plain `Toolbar.Root`. Without a `MenuActions` it is an empty toolbar until one
 * arrives (a tile whose menu is built asynchronously).
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
      <Toolbar.Root
        {...composableProps(props, { classNames: attendableId })}
        disabled={!alwaysActive && !hasAttention}
        ref={forwardedRef}
      >
        <ActionToolbarItems menu={menu} />
        {children}
      </Toolbar.Root>
    );
  },
);

ActionToolbar.displayName = 'ActionToolbar';
