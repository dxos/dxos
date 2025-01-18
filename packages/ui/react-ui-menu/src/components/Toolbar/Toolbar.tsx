//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { ToolbarDropdownMenu } from './ToolbarDropdownMenu';
import { ToolbarToggleGroup } from './ToolbarToggleGroup';
import { type ToolbarActionGroupProperties, type ToolbarProps } from './defs';
import { type MenuAction, type MenuItem, isMenuGroup, isSeparator, type MenuItemGroup } from '../../defs';
import { ActionLabel } from '../ActionLabel';
import { useMenu } from '../MenuContext';

const ToolbarItem = ({ action }: { action: MenuAction }) => {
  const { onAction, iconSize } = useMenu();
  const handleClick = useCallback(() => {
    onAction?.(action);
  }, [action, onAction]);
  const { icon, iconOnly = true, disabled, testId } = action.properties;
  return (
    <NaturalToolbar.IconButton
      key={action.id}
      iconOnly={iconOnly}
      icon={icon}
      size={iconSize}
      label={<ActionLabel action={action} />}
      disabled={disabled}
      onClick={handleClick}
      variant='ghost'
      {...(testId && { 'data-testid': testId })}
    />
  );
};

export const Toolbar = ({ ...props }: ToolbarProps) => {
  const { resolveGroupItems } = useMenu();
  const items = useMemo(() => resolveGroupItems(), [resolveGroupItems]);
  return (
    <NaturalToolbar.Root {...props}>
      {items?.map((item: MenuItem, i: number) =>
        isSeparator(item) ? (
          <NaturalToolbar.Separator key={i} variant={item.properties.variant} />
        ) : isMenuGroup(item) ? (
          item.properties.variant === 'dropdownMenu' ? (
            <ToolbarDropdownMenu key={item.id} group={item as MenuItemGroup<ToolbarActionGroupProperties>} />
          ) : (
            <ToolbarToggleGroup key={item.id} group={item as MenuItemGroup<ToolbarActionGroupProperties>} />
          )
        ) : (
          <ToolbarItem key={item.id} action={item as MenuAction} />
        ),
      )}
    </NaturalToolbar.Root>
  );
};
