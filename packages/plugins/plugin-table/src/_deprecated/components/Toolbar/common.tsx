//
// Copyright 2024 DXOS.org
//

import { type Icon } from '@phosphor-icons/react';
import React from 'react';

import {
  Toolbar as NaturalToolbar,
  Tooltip,
  type ToolbarButtonProps as NaturalToolbarButtonProps,
  type ToolbarToggleGroupItemProps as NaturalToolbarToggleGroupItemProps,
} from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';

// TODO(burdon): Factor out in common with react-ui-editor.

export const iconStyles = getSize(5);
export const buttonStyles = 'min-bs-0 p-2';
export const tooltipProps = { side: 'top' as const, classNames: 'z-10' };

export const ToolbarSeparator = () => <div role='separator' className='grow' />;

//
// ToolbarButton
//

type ToolbarButtonProps = NaturalToolbarButtonProps & { Icon: Icon };

export const ToolbarButton = ({ Icon, children, ...props }: ToolbarButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.Button variant='ghost' {...props} classNames={buttonStyles}>
          <Icon className={iconStyles} />
          <span className='sr-only'>{children}</span>
        </NaturalToolbar.Button>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content {...tooltipProps}>
          {children}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};

//
// ToolbarToggleButton
//

export type ToolbarToggleButtonProps = NaturalToolbarToggleGroupItemProps & { Icon: Icon };

export const ToolbarToggleButton = ({ Icon, children, ...props }: ToolbarToggleButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.ToggleGroupItem variant='ghost' {...props} classNames={buttonStyles}>
          <Icon className={iconStyles} />
          <span className='sr-only'>{children}</span>
        </NaturalToolbar.ToggleGroupItem>
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content {...tooltipProps}>
          {children}
          <Tooltip.Arrow />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
};
