//
// Copyright 2023 DXOS.org
//

import { Toggle as TogglePrimitive } from '@ark-ui/react/toggle';
import React, { forwardRef } from 'react';

import { Button, type ButtonProps } from './Button';

type ToggleProps = ButtonProps & {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ defaultPressed, pressed, onPressedChange, ...props }, forwardedRef) => {
    return (
      <TogglePrimitive.Root {...{ defaultPressed, pressed, onPressedChange }} asChild>
        <Button {...props} ref={forwardedRef} />
      </TogglePrimitive.Root>
    );
  },
);

Toggle.displayName = 'Toggle';

export { Toggle };
export type { ToggleProps };
