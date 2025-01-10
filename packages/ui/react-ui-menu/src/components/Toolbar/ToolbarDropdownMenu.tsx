//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { type ToolbarActionGroupProps } from './defs';
import { type MenuAction } from '../../defs';
import { ActionLabel } from '../ActionLabel';
import { DropdownMenu } from '../DropdownMenu';

export const ToolbarDropdownMenu = ({ actionGroup, graph, onAction }: ToolbarActionGroupProps) => {
  const menuActions = useMemo(() => (graph ? graph.actions(actionGroup) : []) as MenuAction[], [actionGroup, graph]);
  const { icon, iconOnly = true, disabled, testId } = actionGroup.properties;

  return (
    <DropdownMenu.Root actions={menuActions} onAction={onAction}>
      <DropdownMenu.Trigger asChild>
        <NaturalToolbar.IconButton
          iconOnly={iconOnly}
          disabled={disabled}
          icon={icon}
          label={<ActionLabel action={actionGroup} />}
          {...(testId && { 'data-testid': testId })}
        />
      </DropdownMenu.Trigger>
    </DropdownMenu.Root>
  );
};
