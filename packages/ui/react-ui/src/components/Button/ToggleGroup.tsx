//
// Copyright 2023 DXOS.org
//

import { ToggleGroup as ToggleGroupPrimitive } from '@ark-ui/react/toggle-group';
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { Button, ButtonGroup, type ButtonGroupProps, type ButtonProps } from './Button';
import { IconButton, type IconButtonProps } from './IconButton';

type ToggleGroupCommonProps = Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'dir' | 'onChange'> & {
  disabled?: boolean;
  /** Arrow keys move focus between the items; off when an enclosing group (e.g. a toolbar) does that. */
  rovingFocus?: boolean;
  /** Wrap arrow navigation at the ends. */
  loop?: boolean;
  orientation?: 'horizontal' | 'vertical';
};

type ToggleGroupSingleProps = ToggleGroupCommonProps & {
  type: 'single';
  value?: string;
  defaultValue?: string;
  /** The empty string when the pressed item is released. */
  onValueChange?: (value: string) => void;
};

type ToggleGroupMultipleProps = ToggleGroupCommonProps & {
  type: 'multiple';
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

/** The machine speaks arrays; a single-select group speaks one value or none. */
const toMachineValue = (value: string | string[] | undefined): string[] | undefined =>
  value === undefined ? undefined : Array.isArray(value) ? value : value ? [value] : [];

const ToggleGroup = forwardRef<HTMLDivElement, ToggleGroupProps & ButtonGroupProps>(
  ({ classNames, children, elevation, ...props }, forwardedRef) => {
    const { type, value, defaultValue, onValueChange, loop, rovingFocus, ...rootProps } = props;
    const handleValueChange = ({ value }: { value: string[] }) => {
      if (props.type === 'single') {
        props.onValueChange?.(value[0] ?? '');
      } else {
        props.onValueChange?.(value);
      }
    };

    return (
      <ToggleGroupPrimitive.Root
        {...rootProps}
        multiple={type === 'multiple'}
        value={toMachineValue(value)}
        defaultValue={toMachineValue(defaultValue)}
        onValueChange={handleValueChange}
        loopFocus={loop}
        rovingFocus={rovingFocus}
        asChild
      >
        <ButtonGroup {...{ classNames, children, elevation }} ref={forwardedRef} />
      </ToggleGroupPrimitive.Root>
    );
  },
);

ToggleGroup.displayName = 'ToggleGroup';

type ToggleGroupItemProps = ButtonProps & {
  value: string;
};

const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, disabled, variant, elevation, density, classNames, children, ...props }, forwardedRef) => {
    return (
      <ToggleGroupPrimitive.Item value={value} disabled={disabled} asChild>
        <Button {...props} {...{ variant, elevation, density, classNames, children }} ref={forwardedRef} />
      </ToggleGroupPrimitive.Item>
    );
  },
);

ToggleGroupItem.displayName = 'ToggleGroup.Item';

type ToggleGroupIconItemProps = IconButtonProps & {
  value: string;
};

const ToggleGroupIconItem = forwardRef<HTMLButtonElement, ToggleGroupIconItemProps>(
  ({ value, disabled, variant, label, icon, size, elevation, density, classNames, ...props }, forwardedRef) => {
    return (
      <ToggleGroupPrimitive.Item value={value} disabled={disabled} asChild>
        <IconButton {...props} {...{ variant, elevation, density, classNames, label, icon, size }} ref={forwardedRef} />
      </ToggleGroupPrimitive.Item>
    );
  },
);

ToggleGroupIconItem.displayName = 'ToggleGroup.IconItem';

export { ToggleGroup, ToggleGroupIconItem, ToggleGroupItem };
export type { ToggleGroupIconItemProps, ToggleGroupItemProps, ToggleGroupProps };
