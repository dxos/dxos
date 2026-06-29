//
// Copyright 2026 DXOS.org
//

import React, { forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';

import { IconButton, type IconButtonProps } from './IconButton';

export type ToggleIconButtonProps = Omit<IconButtonProps, 'icon'> & {
  active?: boolean;
  /** Icon for the inactive state; rotated 90° in the active state when `activeIcon` is omitted. */
  icon: NonNullable<IconButtonProps['icon']>;
  /** Icon for the active state. When omitted, `icon` rotates 90° (disclosure-style). */
  activeIcon?: NonNullable<IconButtonProps['icon']>;
};

/**
 * Icon button bound to a boolean toggle. With `activeIcon` it swaps icons between states;
 * otherwise it rotates `icon` 90° to signal the active (e.g. expanded) state.
 */
export const ToggleIconButton = forwardRef<HTMLButtonElement, ToggleIconButtonProps>(
  ({ active, icon, activeIcon, iconClassNames, ...props }, forwardedRef) => (
    <IconButton
      {...props}
      ref={forwardedRef}
      icon={active && activeIcon ? activeIcon : icon}
      iconClassNames={activeIcon ? iconClassNames : mx('transition-transform', active && 'rotate-90', iconClassNames)}
    />
  ),
);
