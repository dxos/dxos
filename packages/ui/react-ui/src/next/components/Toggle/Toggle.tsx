//
// Copyright 2026 DXOS.org
//

import { Toggle as TogglePrimitive } from '@ark-ui/react/toggle';
import React from 'react';

import { composable } from '../../../util/index.ts';
import { Button, type ButtonProps } from '../Button/index.ts';

export type ToggleProps = ButtonProps & {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

/** A Button with a pressed state from the zag toggle machine (`aria-pressed`); icon, label and `iconOnly` are Button's. */
export const Toggle = composable<HTMLButtonElement, ToggleProps>(
  ({ pressed, defaultPressed, onPressedChange, disabled, ...props }, forwardedRef) => (
    <TogglePrimitive.Root
      asChild
      pressed={pressed}
      defaultPressed={defaultPressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
    >
      <Button {...props} disabled={disabled} ref={forwardedRef} />
    </TogglePrimitive.Root>
  ),
);

Toggle.displayName = 'Next.Toggle';
