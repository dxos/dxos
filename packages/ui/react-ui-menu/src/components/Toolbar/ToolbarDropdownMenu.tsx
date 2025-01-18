//
// Copyright 2025 DXOS.org
//

import React, { useRef } from 'react';

import { Toolbar as NaturalToolbar } from '@dxos/react-ui';

import { type ToolbarActionGroupProps } from './defs';
import { type MenuAction } from '../../defs';
import { ActionLabel } from '../ActionLabel';
import { DropdownMenu } from '../DropdownMenu';
import { useMenu, useMenuItems } from '../MenuContext';

const triggerProps = {
  variant: 'ghost' as const,
  caretDown: true,
};

export const ToolbarDropdownMenu = ({ group, items: propsItems }: ToolbarActionGroupProps) => {
  const { iconOnly = true, disabled, testId } = group.properties;
  const suppressNextTooltip = useRef(false);
  const { iconSize } = useMenu();
  const items = useMenuItems(group, propsItems);
  const icon =
    ((group.properties as any).applyActiveIcon &&
      (items as MenuAction[])?.find((item) => !!item.properties.checked)?.properties.icon) ||
    group.properties.icon;
  return (
    <DropdownMenu.Root group={group} items={items} suppressNextTooltip={suppressNextTooltip}>
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
