//
// Copyright 2024 DXOS.org
//

import React from 'react';

import {
  Icon,
  type IconProps,
  Toolbar as NaturalToolbar,
  Tooltip,
  type ToolbarButtonProps as NaturalToolbarButtonProps,
  type ToolbarToggleGroupItemProps as NaturalToolbarToggleGroupItemProps,
} from '@dxos/react-ui';

// TODO(burdon): Factor out in common with react-ui-editor.

export const buttonStyles = 'min-bs-0 p-2';
export const tooltipProps = { side: 'top' as const, classNames: 'z-10' };

export const ToolbarSeparator = () => <div role='separator' className='grow' />;

//
// ToolbarButton
//

type ToolbarButtonProps = NaturalToolbarButtonProps & Pick<IconProps, 'icon'>;

export const ToolbarButton = ({ icon, children, ...props }: ToolbarButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.Button variant='ghost' {...props} classNames={buttonStyles}>
          <Icon icon={icon} size={5} />
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

export type ToolbarToggleButtonProps = NaturalToolbarToggleGroupItemProps & Pick<IconProps, 'icon'>;

export const ToolbarToggleButton = ({ icon, children, ...props }: ToolbarToggleButtonProps) => {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <NaturalToolbar.ToggleGroupItem variant='ghost' {...props} classNames={buttonStyles}>
          <Icon icon={icon} size={5} />
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
