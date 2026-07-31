//
// Copyright 2023 DXOS.org
//

import * as SelectPrimitive from '@radix-ui/react-select';
import React, { forwardRef } from 'react';

import { useElevationContext, useSafeCollisionPadding, useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Button, type ButtonProps } from '../Button';
import { Icon } from '../Icon';

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

type SelectTriggerButtonProps = Omit<ButtonProps, 'children'> & Pick<SelectValueProps, 'placeholder' | 'children'>;

const SelectTriggerButton = forwardRef<HTMLButtonElement, SelectTriggerButtonProps>(
  ({ children, placeholder, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.Trigger asChild ref={forwardedRef}>
        <Button {...props} classNames={tx('select.triggerButton', {}, classNames)}>
          <SelectPrimitive.Value placeholder={placeholder}>{children}</SelectPrimitive.Value>
          <SelectPrimitive.Icon asChild>
            <Icon size={3} icon='ph--caret-down--bold' />
          </SelectPrimitive.Icon>
        </Button>
      </SelectPrimitive.Trigger>
    );
  },
);

SelectTriggerButton.displayName = 'Select.TriggerButton';

type SelectContentProps = ThemedClassName<SelectPrimitive.SelectContentProps>;

const SelectContent = forwardRef<HTMLDivElement, SelectContentProps>(
  ({ classNames, children, collisionPadding = 8, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    const elevation = useElevationContext();
    const safeCollisionPadding = useSafeCollisionPadding(collisionPadding);
    return (
      <SelectPrimitive.Content
        {...props}
        data-arrow-keys='up down'
        collisionPadding={safeCollisionPadding}
        className={tx('select.content', { elevation }, classNames)}
        position='popper'
        ref={forwardedRef}
      >
        {children}
      </SelectPrimitive.Content>
    );
  },
);

SelectContent.displayName = 'Select.Content';

type SelectScrollUpButtonProps = ThemedClassName<SelectPrimitive.SelectScrollUpButtonProps>;

const SelectScrollUpButton = forwardRef<HTMLDivElement, SelectScrollUpButtonProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.SelectScrollUpButton
        {...props}
        className={tx('select.scrollButton', {}, classNames)}
        ref={forwardedRef}
      >
        {children ?? <Icon size={3} icon='ph--caret-up--bold' />}
      </SelectPrimitive.SelectScrollUpButton>
    );
  },
);

SelectScrollUpButton.displayName = 'Select.ScrollUpButton';

type SelectScrollDownButtonProps = ThemedClassName<SelectPrimitive.SelectScrollDownButtonProps>;

const SelectScrollDownButton = forwardRef<HTMLDivElement, SelectScrollDownButtonProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.SelectScrollDownButton
        {...props}
        className={tx('select.scrollButton', {}, classNames)}
        ref={forwardedRef}
      >
        {children ?? <Icon size={3} icon='ph--caret-down--bold' />}
      </SelectPrimitive.SelectScrollDownButton>
    );
  },
);

SelectScrollDownButton.displayName = 'Select.ScrollDownButton';

type SelectViewportProps = ThemedClassName<SelectPrimitive.SelectViewportProps>;

const SelectViewport = forwardRef<HTMLDivElement, SelectViewportProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.SelectViewport {...props} className={tx('select.viewport', {}, classNames)} ref={forwardedRef}>
        {children}
      </SelectPrimitive.SelectViewport>
    );
  },
);

SelectViewport.displayName = 'Select.Viewport';

type SelectItemProps = ThemedClassName<SelectPrimitive.SelectItemProps>;

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <SelectPrimitive.Item {...props} className={tx('select.item', {}, classNames)} ref={forwardedRef} />;
});

SelectItem.displayName = 'Select.Item';

type SelectItemTextProps = SelectPrimitive.SelectItemTextProps;

const SelectItemText = SelectPrimitive.ItemText;

type SelectItemIndicatorProps = ThemedClassName<SelectPrimitive.SelectItemIndicatorProps>;

const SelectItemIndicator = forwardRef<HTMLDivElement, SelectItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.ItemIndicator
        {...props}
        className={tx('select.itemIndicator', {}, classNames)}
        ref={forwardedRef}
      >
        {children}
      </SelectPrimitive.ItemIndicator>
    );
  },
);

SelectItemIndicator.displayName = 'Select.ItemIndicator';

type SelectOptionProps = SelectItemProps;

const SelectOption = forwardRef<HTMLDivElement, SelectItemProps>(({ children, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <SelectPrimitive.Item {...props} className={tx('select.item', {}, classNames)} ref={forwardedRef}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <span className='grow' />
      <Icon size={3} icon='ph--check--regular' />
    </SelectPrimitive.Item>
  );
});

SelectOption.displayName = 'Select.Option';

type SelectGroupProps = SelectPrimitive.SelectGroupProps;

const SelectGroup = SelectPrimitive.Group;

type SelectLabelProps = SelectPrimitive.SelectLabelProps;

const SelectLabel = SelectPrimitive.Label;

type SelectSeparatorProps = ThemedClassName<SelectPrimitive.SelectSeparatorProps>;

const SelectSeparator = forwardRef<HTMLDivElement, SelectSeparatorProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <SelectPrimitive.Separator {...props} className={tx('select.separator', {}, classNames)} ref={forwardedRef} />;
});

SelectSeparator.displayName = 'Select.Separator';

type SelectArrowProps = ThemedClassName<SelectPrimitive.SelectArrowProps>;

const SelectArrow = forwardRef<SVGSVGElement, SelectArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <SelectPrimitive.Arrow {...props} className={tx('select.arrow', {}, classNames)} ref={forwardedRef} />;
});

SelectArrow.displayName = 'Select.Arrow';

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
  Option: SelectOption,
  Group: SelectGroup,
  Label: SelectLabel,
  Separator: SelectSeparator,
  Arrow: SelectArrow,
};

export type {
  SelectArrowProps,
  SelectContentProps,
  SelectGroupProps,
  SelectIconProps,
  SelectItemIndicatorProps,
  SelectItemProps,
  SelectItemTextProps,
  SelectLabelProps,
  SelectOptionProps,
  SelectPortalProps,
  SelectRootProps,
  SelectScrollDownButtonProps,
  SelectScrollUpButtonProps,
  SelectSeparatorProps,
  SelectTriggerButtonProps,
  SelectTriggerProps,
  SelectValueProps,
  SelectViewportProps,
};
