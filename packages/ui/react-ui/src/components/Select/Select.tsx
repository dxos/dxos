//
// Copyright 2023 DXOS.org
//

import { CaretDown, CaretUp, Check } from '@phosphor-icons/react';
import * as SelectPrimitive from '@radix-ui/react-select';
import React, { forwardRef } from 'react';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';
import { Button, type ButtonProps } from '../Buttons';

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

const SelectTriggerButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ children, placeholder, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.Trigger asChild ref={forwardedRef}>
        <Button {...props}>
          <SelectPrimitive.Value placeholder={placeholder}>{children}</SelectPrimitive.Value>
          <SelectPrimitive.Icon asChild>
            <>
              <span className='w-1' />
              <CaretDown className={tx('select.triggerIcon', 'select__trigger__icon', {})} weight='bold' />
            </>
          </SelectPrimitive.Icon>
        </Button>
      </SelectPrimitive.Trigger>
    );
  },
);

type SelectContentProps = ThemedClassName<SelectPrimitive.SelectContentProps>;

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

type SelectScrollUpButtonProps = ThemedClassName<SelectPrimitive.SelectScrollUpButtonProps>;

const SelectScrollUpButton = forwardRef<HTMLDivElement, SelectScrollUpButtonProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.SelectScrollUpButton
        {...props}
        className={tx('select.scrollButton', 'select__scroll-button--up', {}, classNames)}
        ref={forwardedRef}
      >
        {children ?? <CaretUp weight='bold' />}
      </SelectPrimitive.SelectScrollUpButton>
    );
  },
);

type SelectScrollDownButtonProps = ThemedClassName<SelectPrimitive.SelectScrollDownButtonProps>;

const SelectScrollDownButton = forwardRef<HTMLDivElement, SelectScrollDownButtonProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.SelectScrollDownButton
        {...props}
        className={tx('select.scrollButton', 'select__scroll-button--down', {}, classNames)}
        ref={forwardedRef}
      >
        {children ?? <CaretDown weight='bold' />}
      </SelectPrimitive.SelectScrollDownButton>
    );
  },
);

type SelectViewportProps = SelectPrimitive.SelectViewportProps;

const SelectViewport = SelectPrimitive.Viewport;

type SelectItemProps = ThemedClassName<SelectPrimitive.SelectItemProps>;

const SelectItem = forwardRef<HTMLDivElement, SelectItemProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return <SelectPrimitive.Item {...props} className={tx('select.item', 'option', {}, classNames)} ref={forwardedRef} />;
});

type SelectItemTextProps = SelectPrimitive.SelectItemTextProps;

const SelectItemText = SelectPrimitive.ItemText;

type SelectItemIndicatorProps = ThemedClassName<SelectPrimitive.SelectItemIndicatorProps>;

const SelectItemIndicator = forwardRef<HTMLDivElement, SelectItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.ItemIndicator
        {...props}
        className={tx('select.itemIndicator', 'option__indicator', {}, classNames)}
        ref={forwardedRef}
      >
        {children}
      </SelectPrimitive.ItemIndicator>
    );
  },
);

type SelectOptionProps = SelectItemProps;

const SelectOption = forwardRef<HTMLDivElement, SelectItemProps>(({ children, classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();

  return (
    <SelectPrimitive.Item {...props} className={tx('select.item', 'option', {}, classNames)} ref={forwardedRef}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className={tx('select.itemIndicator', 'option__indicator', {})}>
        <Check weight='bold' />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
});

type SelectGroupProps = SelectPrimitive.SelectGroupProps;

const SelectGroup = SelectPrimitive.Group;

type SelectLabelProps = SelectPrimitive.SelectLabelProps;

const SelectLabel = SelectPrimitive.Label;

type SelectSeparatorProps = ThemedClassName<SelectPrimitive.SelectSeparatorProps>;

const SelectSeparator = forwardRef<HTMLDivElement, SelectSeparatorProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <SelectPrimitive.Separator
      {...props}
      className={tx('select.separator', 'select__separator', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

type SelectArrowProps = ThemedClassName<SelectPrimitive.SelectArrowProps>;

const SelectArrow = forwardRef<SVGSVGElement, SelectArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();

  return (
    <SelectPrimitive.Arrow
      {...props}
      className={tx('select.arrow', 'select__arrow', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

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
  SelectOptionProps,
  SelectGroupProps,
  SelectLabelProps,
  SelectSeparatorProps,
  SelectArrowProps,
};
