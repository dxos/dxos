//
// Copyright 2025 DXOS.org
//

import { useSignalEffect } from '@preact/signals-react';
import React, { useRef, useState } from 'react';

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

export const ToolbarDropdownMenu = ({ group }: Pick<ToolbarActionGroupProps, 'group'>) => {
  const { iconOnly = true, disabled, testId } = group.properties;
  const suppressNextTooltip = useRef(false);
  const { iconSize, resolveGroupItems } = useMenu();
  const [icon, setIcon] = useState<string>(group.properties.icon);
  useSignalEffect(() => {
    const items = resolveGroupItems?.(group) as MenuAction[];
    setIcon(
      ((group.properties as any).applyActiveIcon &&
        items?.find((item) => !!item.properties.checked)?.properties.icon) ||
        group.properties.icon,
    );
  });
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
