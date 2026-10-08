//
// Copyright 2026 DXOS.org
//

import { Toggle as TogglePrimitive, useToggleContext } from '@ark-ui/react/toggle';
import React from 'react';

import { composable } from '../../../util/slots.ts';
import { Button, type ButtonProps } from '../Button/Button.tsx';

type ToggleIconProps = {
  /** Icon shown while pressed, in place of `icon` (e.g. a filled star for a pinned item). */
  activeIcon?: string;
};

export type ToggleProps = ButtonProps &
  ToggleIconProps & {
    pressed?: boolean;
    defaultPressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
  };

/** A Button with a pressed state from the zag toggle machine (`aria-pressed`); icon, label and `iconOnly` are Button's. */
export const Toggle = composable<HTMLButtonElement, ToggleProps>(
  ({ pressed, defaultPressed, onPressedChange, disabled, activeIcon, ...props }, forwardedRef) => (
    <TogglePrimitive.Root
      asChild
      pressed={pressed}
      defaultPressed={defaultPressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
    >
      <ToggleButton {...props} activeIcon={activeIcon} disabled={disabled} ref={forwardedRef} />
    </TogglePrimitive.Root>
  ),
);

Toggle.displayName = 'Toggle';

/** Reads the machine's pressed state, which an uncontrolled toggle's caller does not have, to swap the icon. */
const ToggleButton = composable<HTMLButtonElement, ButtonProps & ToggleIconProps>(
  ({ activeIcon, ...props }, forwardedRef) => {
    const { pressed } = useToggleContext();
    return <Button {...props} {...(pressed && activeIcon && { icon: activeIcon })} ref={forwardedRef} />;
  },
);
