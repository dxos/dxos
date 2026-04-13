//
// Copyright 2023 DXOS.org
//

import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import React, { forwardRef } from 'react';

import { Button, ButtonGroup, type ButtonGroupProps, type ButtonProps } from './Button';
import { IconButton, type IconButtonProps } from './IconButton';

type ToggleGroupProps =
  | Omit<ToggleGroupPrimitive.ToggleGroupSingleProps, 'className'>
  | Omit<ToggleGroupPrimitive.ToggleGroupMultipleProps, 'className'>;

const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps & ButtonGroupProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    return (
      <ToggleGroupPrimitive.Root {...props} asChild>
        <ButtonGroup {...{ classNames, children }} ref={forwardedRef} />
      </ToggleGroupPrimitive.Root>
    );
  },
);

type ToggleGroupItemProps = Omit<ToggleGroupPrimitive.ToggleGroupItemProps, 'className'> & ButtonProps;

const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ variant, elevation, density, classNames, children, ...props }, forwardedRef) => {
    return (
      <ToggleGroupPrimitive.Item {...props} asChild>
        <Button {...{ variant, elevation, density, classNames, children }} ref={forwardedRef} />
      </ToggleGroupPrimitive.Item>
    );
  },
);

type ToggleGroupIconItemProps = Omit<ToggleGroupPrimitive.ToggleGroupItemProps, 'className'> & IconButtonProps;

const ToggleGroupIconItem = forwardRef<HTMLButtonElement, ToggleGroupIconItemProps>(
  ({ variant, label, icon, size, elevation, density, classNames, ...props }, forwardedRef) => {
    return (
      <ToggleGroupPrimitive.Item {...props} asChild>
        <IconButton {...{ variant, elevation, density, classNames, label, icon, size }} ref={forwardedRef} />
      </ToggleGroupPrimitive.Item>
    );
  },
);

export { ToggleGroup, ToggleGroupItem, ToggleGroupIconItem };
export type { ToggleGroupProps, ToggleGroupItemProps };
