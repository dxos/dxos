//
// Copyright 2023 DXOS.org
//

import * as TogglePrimitive from '@radix-ui/react-toggle';
import React, { forwardRef } from 'react';

import { Button, type ButtonProps } from './Button';

type ToggleProps = Omit<TogglePrimitive.ToggleProps, 'asChild'> & ButtonProps;

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ defaultPressed, pressed, onPressedChange, ...props }, forwardedRef) => {
    return (
      <TogglePrimitive.Root {...{ defaultPressed, pressed, onPressedChange }} asChild>
        <Button {...props} ref={forwardedRef} />
      </TogglePrimitive.Root>
    );
  },
);

export { Toggle };
export type { ToggleProps };
