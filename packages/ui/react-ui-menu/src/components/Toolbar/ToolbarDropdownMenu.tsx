//
// Copyright 2025 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { useToolbar } from './ToolbarContext';
import { type ToolbarActionGroupProps, type ToolbarItem } from './defs';
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
}: Pick<ToolbarActionGroupProps, 'actionGroup'> & { menuActions: MenuAction[] }) => {
  const { icon, iconOnly = true, disabled, testId } = actionGroup.properties;
  const suppressNextTooltip = useRef(false);
  const { onAction } = useToolbar();

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
export const ToolbarDropdownMenu = ({ actionGroup }: ToolbarActionGroupProps) => {
  const [items, setItems] = useState<ToolbarItem[] | null>(null);
  const { resolveGroupItems } = useToolbar();
  useEffect(() => {
    void resolveGroupItems(actionGroup).then((items) => setItems(items));
  }, [resolveGroupItems]);
  return Array.isArray(items) ? (
    <ToolbarDropdownMenuImpl actionGroup={actionGroup} menuActions={items as MenuAction[]} />
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
