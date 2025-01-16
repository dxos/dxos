//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { ToolbarContext } from './ToolbarContext';
import { ToolbarDropdownMenu } from './ToolbarDropdownMenu';
import { ToolbarToggleGroup } from './ToolbarToggleGroup';
import { isMenu, isSeparator, type ToolbarProps } from './defs';
import { type MenuAction } from '../../defs';
import { ActionLabel } from '../ActionLabel';

const ToolbarItem = ({
  iconSize,
  action,
  onAction,
}: Pick<ToolbarProps, 'iconSize' | 'onAction'> & {
  action: MenuAction;
}) => {
  const handleClick = useCallback(() => {
    onAction?.(action);
  }, [action, onAction]);
  const { icon, iconOnly = true, disabled, testId } = action.properties;
  return (
    <NaturalToolbar.IconButton
      key={action.id}
      iconOnly={iconOnly}
      variant='ghost'
      icon={icon}
      size={iconSize}
      label={<ActionLabel action={action} />}
      disabled={disabled}
      onClick={handleClick}
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
              <ToolbarDropdownMenu key={item.id} actionGroup={item} onAction={onAction} iconSize={iconSize} />
            ) : (
              <ToolbarToggleGroup key={item.id} actionGroup={item} onAction={onAction} iconSize={iconSize} />
            )
          ) : (
            <ToolbarItem key={item.id} action={item as MenuAction} onAction={onAction} iconSize={iconSize} />
          ),
        )}
      </NaturalToolbar.Root>
    </ToolbarContext.Provider>
  );
};
