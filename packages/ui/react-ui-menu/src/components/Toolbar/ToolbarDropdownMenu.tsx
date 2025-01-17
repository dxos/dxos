//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { useToolbar } from './ToolbarContext';
import { type ToolbarActionGroupProps } from './defs';
import { type MenuAction } from '../../defs';
import { ActionLabel } from '../ActionLabel';
import { DropdownMenu } from '../DropdownMenu';

const triggerProps = {
  variant: 'ghost' as const,
  caretDown: true,
};

export const ToolbarDropdownMenuImpl = ({
  actionGroup,
  menuActions,
}: Pick<ToolbarActionGroupProps, 'actionGroup'> & { menuActions: MenuAction[] }) => {
  const { icon, iconOnly = true, disabled, testId } = actionGroup.properties;
  const suppressNextTooltip = useRef(false);
  const { onAction, iconSize } = useToolbar();

  return (
    <DropdownMenu.Root actions={menuActions} onAction={onAction} suppressNextTooltip={suppressNextTooltip}>
      <DropdownMenu.Trigger asChild>
        <NaturalToolbar.IconButton
          {...triggerProps}
          iconOnly={iconOnly}
          disabled={disabled}
          icon={
            ((actionGroup.properties as any).applyActiveIcon &&
              menuActions.find((action) => !!action.properties.checked)?.properties.icon) ||
            icon
          }
          size={iconSize}
          label={<ActionLabel action={actionGroup} />}
          {...(testId && { 'data-testid': testId })}
          suppressNextTooltip={suppressNextTooltip}
        />
      </DropdownMenu.Trigger>
    </DropdownMenu.Root>
  );
};

// TODO(thure): Refactor to use actions getter callback (which we realize now should be async).
export const ToolbarDropdownMenu = ({ actionGroup }: ToolbarActionGroupProps) => {
  const { resolveGroupItems } = useToolbar();
  const items = useMemo(() => resolveGroupItems(actionGroup), [resolveGroupItems, actionGroup]);
  return Array.isArray(items) ? (
    <ToolbarDropdownMenuImpl actionGroup={actionGroup} menuActions={items as MenuAction[]} />
  ) : null;
};
