//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { type ToolbarActionGroupProps } from './defs';
import { ActionLabel } from '../ActionLabel';
import { DropdownMenu } from '../DropdownMenu';

export const ToolbarDropdownMenu = ({ actionGroup, graph }: ToolbarActionGroupProps) => {
  const menuActions = useMemo(() => (graph ? graph.actions(actionGroup) : []), [actionGroup, graph]);
  const { icon, iconOnly = true, disabled, testId } = actionGroup.properties;
  return (
    <DropdownMenu.Root actions={menuActions}>
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
