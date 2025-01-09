//
// Copyright 2025 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { ToolbarDropdownMenu } from './ToolbarDropdownMenu';
import { ToolbarToggleGroup } from './ToolbarToggleGroup';
import { isMenu, isSeparator, type ToolbarAction, type ToolbarProps } from './defs';
import { ActionLabel } from '../ActionLabel';

const ToolbarItem = ({
  iconSize,
  action,
  onClick,
}: Pick<ToolbarProps, 'iconSize'> & {
  action: ToolbarAction;
  onClick: (action: ToolbarAction, event: MouseEvent) => void;
}) => {
  const handleClick = useCallback(
    (event: MouseEvent) => {
      onClick(action, event);
    },
    [action, onClick],
  );
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
  const handleActionClick = useCallback((action: ToolbarAction) => {
    if (action.properties?.disabled) {
      return;
    }
    onAction?.(action);
  }, []);
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
              onClick={handleActionClick}
              iconSize={iconSize}
              graph={graph}
            />
          ) : (
            <ToolbarToggleGroup
              key={item.id}
              actionGroup={item}
              onClick={handleActionClick}
              iconSize={iconSize}
              graph={graph}
            />
          )
        ) : (
          <ToolbarItem key={item.id} action={item as ToolbarAction} onClick={handleActionClick} iconSize={iconSize} />
        ),
      )}
    </NaturalToolbar.Root>
  );
};
