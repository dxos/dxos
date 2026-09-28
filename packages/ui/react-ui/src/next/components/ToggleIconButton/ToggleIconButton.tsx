//
// Copyright 2026 DXOS.org
//

import { Toggle } from '@ark-ui/react/toggle';
import React from 'react';

import { composable } from '../../../util/index.ts';
import { IconButton, type IconButtonProps } from '../IconButton/index.ts';

export type ToggleIconButtonProps = IconButtonProps & {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

/** An IconButton with a pressed state from the zag toggle machine (`aria-pressed`); its label shows in a Tooltip. */
export const ToggleIconButton = composable<HTMLButtonElement, ToggleIconButtonProps>(
  ({ pressed, defaultPressed, onPressedChange, disabled, ...props }, forwardedRef) => (
    <Toggle.Root
      asChild
      pressed={pressed}
      defaultPressed={defaultPressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
    >
      <IconButton {...props} disabled={disabled} ref={forwardedRef} />
    </Toggle.Root>
  ),
);

ToggleIconButton.displayName = 'Next.ToggleIconButton';
