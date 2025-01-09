//
// Copyright 2025 DXOS.org
//

import React, { type MouseEvent, useCallback } from 'react';

import { type Action } from '@dxos/app-graph';
import { Toolbar as NaturalToolbar, type IconButtonProps } from '@dxos/react-ui';

import { ActionLabel } from './ActionLabel';
import { type MenuProps } from '../defs';

export type ToolbarProps = MenuProps & { iconSize?: IconButtonProps['size'] };

const ToolbarItem = ({
  iconSize,
  action,
  onClick,
}: Pick<ToolbarProps, 'iconSize'> & { action: Action; onClick: (action: Action, event: MouseEvent) => void }) => {
  const handleClick = useCallback(
    (event: MouseEvent) => {
      onClick(action, event);
    },
    [action, onClick],
  );
  return (
    <NaturalToolbar.IconButton
      key={action.id}
      iconOnly
      variant='ghost'
      icon={action.properties!.icon}
      size={iconSize}
      label={<ActionLabel action={action} />}
      disabled={action.properties?.disabled}
      onClick={handleClick}
      {...(action.properties?.testId && { 'data-testid': action.properties.testId })}
    />
  );
};

export const Toolbar = ({ actions, onAction, iconSize = 5 }: ToolbarProps) => {
  const handleActionClick = useCallback((action: Action) => {
    if (action.properties?.disabled) {
      return;
    }
    onAction?.(action);
  }, []);
  return (
    <NaturalToolbar.Root>
      {actions?.map((action) => (
        <ToolbarItem key={action.id} action={action} iconSize={iconSize} onClick={handleActionClick} />
      ))}
    </NaturalToolbar.Root>
  );
};
