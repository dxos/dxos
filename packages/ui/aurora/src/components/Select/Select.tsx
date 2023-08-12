//
// Copyright 2023 DXOS.org
//

import { CaretDown } from '@phosphor-icons/react';
import * as SelectPrimitive from '@radix-ui/react-select';
import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { ThemedClassName } from '../../util';
import { Button, ButtonProps } from '../Buttons';

type SelectRootProps = SelectPrimitive.SelectProps;

const SelectRoot = SelectPrimitive.Root;

type SelectTriggerProps = SelectPrimitive.SelectTriggerProps;

const SelectTrigger = SelectPrimitive.Trigger;

type SelectValueProps = SelectPrimitive.SelectValueProps;

const SelectValue = SelectPrimitive.Value;

type SelectIconProps = SelectPrimitive.SelectIconProps;

const SelectIcon = SelectPrimitive.Icon;

type SelectPortalProps = SelectPrimitive.SelectPortalProps;

const SelectPortal = SelectPrimitive.Portal;

type SelectTriggerButtonProps = Omit<ButtonProps, 'children'> & Pick<SelectValueProps, 'placeholder'>;

const SelectTriggerButton = forwardRef<HTMLButtonElement, ButtonProps>(({ placeholder, ...props }, forwardedRef) => {
  return (
    <SelectPrimitive.Trigger asChild>
      <Button {...props} ref={forwardedRef}>
        <SelectPrimitive.Value placeholder={placeholder} />
        <SelectPrimitive.Icon className='pis-2'>
          <CaretDown />
        </SelectPrimitive.Icon>
      </Button>
    </SelectPrimitive.Trigger>
  );
});

type SelectContentProps = ThemedClassName<SelectPrimitive.SelectContentProps>;

// TODO(burdon): Make same width as trigger?
const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.Content
        {...props}
        className={tx('select.content', 'select__content', {}, classNames)}
        ref={forwardedRef}
      >
        {children}
      </SelectPrimitive.Content>
    );
  },
);

type SelectScrollUpButtonProps = SelectPrimitive.SelectScrollUpButtonProps;

const SelectScrollUpButton = SelectPrimitive.SelectScrollUpButton;

type SelectScrollDownButtonProps = SelectPrimitive.SelectScrollDownButtonProps;

const SelectScrollDownButton = SelectPrimitive.SelectScrollDownButton;

type SelectViewportProps = SelectPrimitive.SelectViewportProps;

const SelectViewport = SelectPrimitive.Viewport;

type SelectItemProps = SelectPrimitive.SelectItemProps;

const SelectItem = SelectPrimitive.Item;

type SelectItemTextProps = SelectPrimitive.SelectItemTextProps;

const SelectItemText = SelectPrimitive.ItemText;

type SelectItemIndicatorProps = SelectPrimitive.SelectItemIndicatorProps;

const SelectItemIndicator = SelectPrimitive.ItemIndicator;

type SelectGroupProps = SelectPrimitive.SelectGroupProps;

const SelectGroup = SelectPrimitive.Group;

type SelectLabelProps = SelectPrimitive.SelectLabelProps;

const SelectLabel = SelectPrimitive.Label;

type SelectSeparatorProps = SelectPrimitive.SelectSeparatorProps;

const SelectSeparator = SelectPrimitive.Separator;

type SelectArrowProps = SelectPrimitive.SelectArrowProps;

const SelectArrow = SelectPrimitive.Arrow;

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  TriggerButton: SelectTriggerButton,
  Value: SelectValue,
  Icon: SelectIcon,
  Portal: SelectPortal,
  Content: SelectContent,
  ScrollUpButton: SelectScrollUpButton,
  ScrollDownButton: SelectScrollDownButton,
  Viewport: SelectViewport,
  Item: SelectItem,
  ItemText: SelectItemText,
  ItemIndicator: SelectItemIndicator,
  Group: SelectGroup,
  Label: SelectLabel,
  Separator: SelectSeparator,
  Arrow: SelectArrow,
};

export type {
  SelectRootProps,
  SelectTriggerProps,
  SelectTriggerButtonProps,
  SelectValueProps,
  SelectIconProps,
  SelectPortalProps,
  SelectContentProps,
  SelectScrollUpButtonProps,
  SelectScrollDownButtonProps,
  SelectViewportProps,
  SelectItemProps,
  SelectItemTextProps,
  SelectItemIndicatorProps,
  SelectGroupProps,
  SelectLabelProps,
  SelectSeparatorProps,
  SelectArrowProps,
};
