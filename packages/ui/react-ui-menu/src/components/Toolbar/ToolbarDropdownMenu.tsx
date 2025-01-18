//
// Copyright 2025 DXOS.org
//

import React, { useMemo, useRef } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { type ToolbarActionGroupProps } from './defs';
import { type MenuAction } from '../../defs';
import { ActionLabel } from '../ActionLabel';
import { DropdownMenu } from '../DropdownMenu';
import { useMenu } from '../MenuContext';

const triggerProps = {
  variant: 'ghost' as const,
  caretDown: true,
};

export const ToolbarDropdownMenuImpl = ({ group }: Pick<ToolbarActionGroupProps, 'group'>) => {
  const { iconOnly = true, disabled, testId } = group.properties;
  const suppressNextTooltip = useRef(false);
  const { iconSize, resolveGroupItems } = useMenu();
  const icon = useMemo(() => {
    const items = resolveGroupItems?.(group) as MenuAction[];
    return (
      ((group.properties as any).applyActiveIcon &&
        items?.find((item) => !!item.properties.checked)?.properties.icon) ||
      group.properties.icon
    );
  }, [group, resolveGroupItems]);
  return (
    <DropdownMenu.Root group={group} suppressNextTooltip={suppressNextTooltip}>
      <DropdownMenu.Trigger asChild>
        <NaturalToolbar.IconButton
          {...triggerProps}
          iconOnly={iconOnly}
          disabled={disabled}
          icon={icon}
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
  const { resolveGroupItems } = useMenu();
  const items = useMemo(() => resolveGroupItems(group), [resolveGroupItems, group]);
  return Array.isArray(items) ? <ToolbarDropdownMenuImpl group={group} /> : null;
};
