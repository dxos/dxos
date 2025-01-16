//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { type ToolbarActionGroupProps } from './defs';
import { type MenuAction } from '../../defs';
import { ActionLabel } from '../ActionLabel';
import { DropdownMenu } from '../DropdownMenu';

const triggerProps = {
  size: 5 as const,
  variant: 'ghost' as const,
  caretDown: true,
};

export const ToolbarDropdownMenuImpl = ({
  actionGroup,
  menuActions,
  onAction,
}: Pick<ToolbarActionGroupProps, 'actionGroup' | 'onAction'> & { menuActions: MenuAction[] }) => {
  const { icon, iconOnly = true, disabled, testId } = actionGroup.properties;
  const suppressNextTooltip = useRef(false);

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
          label={<ActionLabel action={actionGroup} />}
          {...(testId && { 'data-testid': testId })}
          suppressNextTooltip={suppressNextTooltip}
        />
      </DropdownMenu.Trigger>
    </DropdownMenu.Root>
  );
};

// TODO(thure): Refactor to use actions getter callback (which we realize now should be async).
export const ToolbarDropdownMenu = ({ actionGroup, graph, onAction }: ToolbarActionGroupProps) => {
  const [actions, setActions] = useState<MenuAction[] | null>(null);
  useEffect(() => {
    if (graph) {
      void graph.waitForNode(actionGroup.id).then((groupNode) => {
        setActions((graph.actions(groupNode) ?? []) as MenuAction[]);
      });
    }
  }, [graph]);
  return Array.isArray(actions) ? (
    <ToolbarDropdownMenuImpl actionGroup={actionGroup} menuActions={actions} onAction={onAction} />
  ) : (
    <NaturalToolbar.IconButton
      {...triggerProps}
      disabled
      iconOnly={actionGroup.properties.iconOnly}
      icon={actionGroup.properties.icon}
      label={<ActionLabel action={actionGroup} />}
    />
  );
};
