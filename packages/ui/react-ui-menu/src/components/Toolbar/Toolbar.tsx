//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { ToolbarContext, useToolbar } from './ToolbarContext';
import { ToolbarDropdownMenu } from './ToolbarDropdownMenu';
import { ToolbarToggleGroup } from './ToolbarToggleGroup';
import { type ToolbarProps } from './defs';
import { type MenuAction, type MenuItem, isMenuGroup, isSeparator } from '../../defs';
import { ActionLabel } from '../ActionLabel';

const ToolbarItem = ({ action }: { action: MenuAction }) => {
  const { onAction, iconSize } = useToolbar();
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

const resolveGroupItemsNoop = () => null;

export const Toolbar = ({
  onAction = () => {},
  iconSize = 5,
  resolveGroupItems = resolveGroupItemsNoop,
  ...props
}: ToolbarProps) => {
  const contextValue = useMemo(
    () => ({ resolveGroupItems, onAction, iconSize }),
    [resolveGroupItems, onAction, iconSize],
  );
  const items = useMemo(() => resolveGroupItems(), [resolveGroupItems]);
  return (
    <ToolbarContext.Provider value={contextValue}>
      <NaturalToolbar.Root {...props}>
        {items?.map((item: MenuItem, i: number) =>
          isSeparator(item) ? (
            <NaturalToolbar.Separator key={i} variant={item.properties.variant} />
          ) : isMenuGroup(item) ? (
            item.properties.variant === 'dropdownMenu' ? (
              <ToolbarDropdownMenu key={item.id} group={item} />
            ) : (
              <ToolbarToggleGroup key={item.id} group={item} />
            )
          ) : (
            <ToolbarItem key={item.id} action={item as MenuAction} />
          ),
        )}
      </NaturalToolbar.Root>
    </ToolbarContext.Provider>
  );
};
