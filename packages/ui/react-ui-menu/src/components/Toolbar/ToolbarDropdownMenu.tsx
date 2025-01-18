//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { useToolbar } from './ToolbarContext';
import { type ToolbarActionGroupProps } from './defs';
import { type MenuAction, type MenuItem } from '../../defs';
import { ActionLabel } from '../ActionLabel';
import { DropdownMenu } from '../DropdownMenu';

const triggerProps = {
  variant: 'ghost' as const,
  caretDown: true,
};

export const ToolbarDropdownMenuImpl = ({
  group,
  items,
}: Pick<ToolbarActionGroupProps, 'group'> & { items: MenuItem[] }) => {
  const { icon, iconOnly = true, disabled, testId } = group.properties;
  const suppressNextTooltip = useRef(false);
  const { onAction, iconSize } = useToolbar();

  // TODO(thure): Handle other types of items.
  const menuActions = items as MenuAction[];

  return (
    <DropdownMenu.Root items={menuActions} onAction={onAction} suppressNextTooltip={suppressNextTooltip}>
      <DropdownMenu.Trigger asChild>
        <NaturalToolbar.IconButton
          {...triggerProps}
          iconOnly={iconOnly}
          disabled={disabled}
          icon={
            ((group.properties as any).applyActiveIcon &&
              menuActions.find((action) => !!action.properties.checked)?.properties.icon) ||
            icon
          }
          size={iconSize}
          label={<ActionLabel action={group} />}
          {...(testId && { 'data-testid': testId })}
          suppressNextTooltip={suppressNextTooltip}
        />
      </DropdownMenu.Trigger>
    </DropdownMenu.Root>
  );
};

// TODO(thure): Refactor to use actions getter callback (which we realize now should be async).
export const ToolbarDropdownMenu = ({ group }: ToolbarActionGroupProps) => {
  const { resolveGroupItems } = useToolbar();
  const items = useMemo(() => resolveGroupItems(group), [resolveGroupItems, group]);
  return Array.isArray(items) ? <ToolbarDropdownMenuImpl group={group} items={items} /> : null;
};
