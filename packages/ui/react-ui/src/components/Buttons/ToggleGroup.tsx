//
// Copyright 2023 DXOS.org
//

import {
  ToggleGroupItem as ToggleGroupItemPrimitive,
  type ToggleGroupItemProps as ToggleGroupItemPrimitiveProps,
  type ToggleGroupMultipleProps,
  ToggleGroup as ToggleGroupPrimitive,
  type ToggleGroupSingleProps,
} from '@radix-ui/react-toggle-group';
import React, { forwardRef } from 'react';

import { Button, ButtonGroup, type ButtonGroupProps, type ButtonProps } from './Button';

type ToggleGroupProps = Omit<ToggleGroupSingleProps, 'className'> | Omit<ToggleGroupMultipleProps, 'className'>;

const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps & ButtonGroupProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    return (
      <ToggleGroupPrimitive {...props} asChild>
        <ButtonGroup {...{ classNames, children }} ref={forwardedRef} />
      </ToggleGroupPrimitive>
    );
  },
);

type ToggleGroupItemProps = Omit<ToggleGroupItemPrimitiveProps, 'className'> & ButtonProps;

const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ variant, elevation, density, classNames, children, ...props }, forwardedRef) => {
    return (
      <ToggleGroupItemPrimitive {...props} asChild>
        <Button {...{ variant, elevation, density, classNames, children }} ref={forwardedRef} />
      </ToggleGroupItemPrimitive>
    );
  },
);

export { ToggleGroup, ToggleGroupItem };
export type { ToggleGroupProps, ToggleGroupItemProps };
