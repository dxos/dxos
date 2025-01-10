//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import type { ToolbarActionGroupProps } from './defs';
import { type MenuAction } from '../../defs';
import { ActionLabel } from '../ActionLabel';

const ToolbarToggleGroupItem = ({ action }: { action: MenuAction }) => {
  const { icon, iconOnly, disabled } = action.properties;
  return (
    <NaturalToolbar.ToggleGroupIconItem
      key={action.id}
      value={action.id}
      icon={icon}
      iconOnly={iconOnly}
      disabled={disabled}
      label={<ActionLabel action={action} />}
    />
  );
};

export const ToolbarToggleGroup = ({ actionGroup, graph }: ToolbarActionGroupProps) => {
  const menuActions = useMemo(() => (graph ? (graph.actions(actionGroup) as MenuAction[]) : []), [actionGroup, graph]);
  const { selectCardinality, value } = actionGroup.properties;
  return (
    // TODO(thure): This is extremely difficult to manage, what do?
    // @ts-ignore
    <NaturalToolbar.ToggleGroup type={selectCardinality} value={value}>
      {menuActions.map((action) => (
        <ToolbarToggleGroupItem key={action.id} action={action} />
      ))}
    </NaturalToolbar.ToggleGroup>
  );
};
