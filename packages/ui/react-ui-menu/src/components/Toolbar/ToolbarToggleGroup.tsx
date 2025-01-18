//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import type { ToolbarActionGroupProps } from './defs';
import { type MenuAction } from '../../defs';
import { ActionLabel } from '../ActionLabel';
import { useMenu } from '../MenuContext';

const ToolbarToggleGroupItem = ({ action }: { action: MenuAction }) => {
  const { iconSize, onAction } = useMenu();
  const { icon, iconOnly = true, disabled } = action.properties;
  const handleClick = useCallback(() => {
    onAction?.(action);
  }, [action, onAction]);
  return (
    <NaturalToolbar.ToggleGroupIconItem
      key={action.id}
      value={action.id}
      icon={icon}
      size={iconSize}
      iconOnly={iconOnly}
      disabled={disabled}
      label={<ActionLabel action={action} />}
      onClick={handleClick}
      variant='ghost'
    />
  );
};

export const ToolbarToggleGroup = ({ group }: ToolbarActionGroupProps) => {
  const { resolveGroupItems } = useMenu();
  const items = useMemo(() => resolveGroupItems(group), [resolveGroupItems, group]);
  const { selectCardinality, value } = group.properties;
  return Array.isArray(items) ? (
    // TODO(thure): The type here is difficult to manage, what do?
    // @ts-ignore
    <NaturalToolbar.ToggleGroup type={selectCardinality} value={value}>
      {(items as MenuAction[]).map((action) => (
        <ToolbarToggleGroupItem key={action.id} action={action} />
      ))}
    </NaturalToolbar.ToggleGroup>
  ) : null;
};
