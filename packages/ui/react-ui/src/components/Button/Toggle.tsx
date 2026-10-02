//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import { Toggle as TogglePrimitive } from '@ark-ui/react/toggle';
import React, { forwardRef } from 'react';

import * as Button from './Button.tsx';
type ToggleProps = Button.RootProps & {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
};

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ defaultPressed, pressed, onPressedChange, ...props }, forwardedRef) => {
    return (
      <TogglePrimitive.Root {...{ defaultPressed, pressed, onPressedChange }} asChild>
        <Button.Root {...props} ref={forwardedRef} />
      </TogglePrimitive.Root>
    );
  },
);

Toggle.displayName = 'Toggle';

export { Toggle as Root };
export type { ToggleProps as RootProps };
