//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { ToolbarDropdownMenu } from './ToolbarDropdownMenu';
import { ToolbarToggleGroup } from './ToolbarToggleGroup';
import { isMenu, isSeparator, type ToolbarAction, type ToolbarProps } from './defs';
import { ActionLabel } from '../ActionLabel';

const ToolbarItem = ({
  iconSize,
  action,
  onAction,
}: Pick<ToolbarProps, 'iconSize' | 'onAction'> & {
  action: ToolbarAction;
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

export const Toolbar = ({ actions: items, onAction, iconSize = 5, graph, ...props }: ToolbarProps) => {
  return (
    <NaturalToolbar.Root {...props}>
      {items?.map((item, i) =>
        isSeparator(item) ? (
          <NaturalToolbar.Separator key={i} variant={item.properties.variant} />
        ) : isMenu(item) ? (
          item.properties.variant === 'dropdownMenu' ? (
            <ToolbarDropdownMenu
              key={item.id}
              actionGroup={item}
              onAction={onAction}
              iconSize={iconSize}
              graph={graph}
            />
          ) : (
            <ToolbarToggleGroup
              key={item.id}
              actionGroup={item}
              onAction={onAction}
              iconSize={iconSize}
              graph={graph}
            />
          )
        ) : (
          <ToolbarItem key={item.id} action={item as ToolbarAction} onAction={onAction} iconSize={iconSize} />
        ),
      )}
    </NaturalToolbar.Root>
  );
};
