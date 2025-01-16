//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { ToolbarContext, useToolbar } from './ToolbarContext';
import { ToolbarDropdownMenu } from './ToolbarDropdownMenu';
import { ToolbarToggleGroup } from './ToolbarToggleGroup';
import { isMenu, isSeparator, type ToolbarProps } from './defs';
import { type MenuAction } from '../../defs';
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

const resolveGroupItemsNoop = async () => null;

export const Toolbar = ({
  actions: items,
  onAction = () => {},
  iconSize = 5,
  resolveGroupItems = resolveGroupItemsNoop,
  ...props
}: ToolbarProps) => {
  const contextValue = useMemo(
    () => ({ resolveGroupItems, onAction, iconSize }),
    [resolveGroupItems, onAction, iconSize],
  );
  return (
    <ToolbarContext.Provider value={contextValue}>
      <NaturalToolbar.Root {...props}>
        {items?.map((item, i) =>
          isSeparator(item) ? (
            <NaturalToolbar.Separator key={i} variant={item.properties.variant} />
          ) : isMenu(item) ? (
            item.properties.variant === 'dropdownMenu' ? (
              <ToolbarDropdownMenu key={item.id} actionGroup={item} />
            ) : (
              <ToolbarToggleGroup key={item.id} actionGroup={item} />
            )
          ) : (
            <ToolbarItem key={item.id} action={item as MenuAction} />
          ),
        )}
      </NaturalToolbar.Root>
    </ToolbarContext.Provider>
  );
};
