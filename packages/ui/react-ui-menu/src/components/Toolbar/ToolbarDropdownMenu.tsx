//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { type ToolbarActionGroupProps } from './defs';
import { type MenuAction } from '../../defs';
import { ActionLabel } from '../ActionLabel';
import { DropdownMenu } from '../DropdownMenu';

export const ToolbarDropdownMenu = ({ actionGroup, graph, onAction }: ToolbarActionGroupProps) => {
  const menuActions = useMemo(() => (graph ? graph.actions(actionGroup) : []) as MenuAction[], [actionGroup, graph]);
  const { icon, iconOnly = true, disabled, testId } = actionGroup.properties;
  const suppressNextTooltip = useRef(false);

  return (
    <DropdownMenu.Root actions={menuActions} onAction={onAction} suppressNextTooltip={suppressNextTooltip}>
      <DropdownMenu.Trigger asChild>
        <NaturalToolbar.IconButton
          size={5}
          variant='ghost'
          iconOnly={iconOnly}
          disabled={disabled}
          icon={
            ((actionGroup.properties as any).applyActiveIcon &&
              menuActions.find((action) => !!action.properties.checked)?.properties.icon) ||
            icon
          }
          label={<ActionLabel action={actionGroup} />}
          {...(testId && { 'data-testid': testId })}
          suppressNextTooltip={suppressNextTooltip}
          caretDown
        />
      </DropdownMenu.Trigger>
    </DropdownMenu.Root>
  );
};
