//
// Copyright 2023 DXOS.org
//

import { Toggle as TogglePrimitive, type ToggleProps as TogglePrimitiveProps } from '@radix-ui/react-toggle';
import React, { forwardRef } from 'react';

import { Button, type ButtonProps } from './Button';

type ToggleProps = Omit<TogglePrimitiveProps, 'asChild'> & ButtonProps;

const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(
  ({ defaultPressed, pressed, onPressedChange, ...props }, forwardedRef) => (
    <TogglePrimitive {...{ defaultPressed, pressed, onPressedChange }} asChild>
      <Button {...props} ref={forwardedRef} />
    </TogglePrimitive>
  ),
);

export { Toggle };
export type { ToggleProps };
