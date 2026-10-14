//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { ToggleGroup as ToggleGroupPrimitive } from '@ark-ui/react/toggle-group';
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { recipes } from '../../recipes.ts';
import { Button } from '../Button/Button.tsx';

//
// Root
//

type ToggleGroupCommonProps = ThemedClassName<
  Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'dir' | 'onChange'>
> & {
  disabled?: boolean;
  orientation?: 'horizontal' | 'vertical';
  /** Wrap arrow navigation at the ends. */
  loop?: boolean;
  /** Arrow keys move focus between the items; off when an enclosing Toolbar roves over them instead. */
  rovingFocus?: boolean;
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

type ToggleGroupRootProps = ToggleGroupSingleProps | ToggleGroupMultipleProps;

/** The machine speaks arrays; a single-select group speaks one value or none. */
const toMachineValue = (value: string | string[] | undefined): string[] | undefined =>
  value === undefined ? undefined : Array.isArray(value) ? value : value ? [value] : [];

/**
 * Ark toggle group: `single` is a `radiogroup` of `radio` items (`aria-checked`), `multiple` a `group` of pressed
 * toggles (`aria-pressed`), with roving focus between the items unless `rovingFocus={false}`.
 */
const ToggleGroupRoot = forwardRef<HTMLDivElement, ToggleGroupRootProps>((props, forwardedRef) => {
  const { classNames, type, value, defaultValue, onValueChange: _, loop, rovingFocus = true, ...rootProps } = props;
  return (
    <ToggleGroupPrimitive.Root
      {...rootProps}
      multiple={type === 'multiple'}
      value={toMachineValue(value)}
      defaultValue={toMachineValue(defaultValue)}
      onValueChange={({ value }) => {
        if (props.type === 'single') {
          props.onValueChange?.(value[0] ?? '');
        } else {
          props.onValueChange?.(value);
        }
      }}
      loopFocus={loop}
      rovingFocus={rovingFocus}
      // zag makes the root a tab stop that forwards focus to an item; without roving the items are the tab stops.
      {...(!rovingFocus && { tabIndex: -1 })}
      className={mx(recipes.toggleGroup(), classNames)}
      ref={forwardedRef}
    />
  );
});

ToggleGroupRoot.displayName = 'ToggleGroup.Root';

//
// Item
//

type ToggleGroupItemProps = ComponentPropsWithoutRef<typeof Button> & {
  value: string;
};

/** A Button whose pressed state belongs to the group. */
const ToggleGroupItem = forwardRef<HTMLButtonElement, ToggleGroupItemProps>(
  ({ value, disabled, ...props }, forwardedRef) => (
    <ToggleGroupPrimitive.Item value={value} disabled={disabled} asChild>
      <Button {...props} disabled={disabled} ref={forwardedRef} />
    </ToggleGroupPrimitive.Item>
  ),
);

ToggleGroupItem.displayName = 'ToggleGroup.Item';
export type { ToggleGroupItemProps as ItemProps, ToggleGroupRootProps as RootProps };

export { ToggleGroupItem as Item, ToggleGroupRoot as Root };
