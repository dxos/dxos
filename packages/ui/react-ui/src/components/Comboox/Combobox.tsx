//
// Copyright 2023 DXOS.org
//

// TODO(thure): Use the new Combobox primitive.

import { CaretDown, CaretUp, Check } from '@phosphor-icons/react';
import * as SelectPrimitive from '@radix-ui/react-select';
import React, { forwardRef } from 'react';

import { TextInput, type TextInputProps } from '@dxos/react-input';

import { useThemeContext } from '../../hooks';
import { type ThemedClassName } from '../../util';

type ComboboxRootProps = SelectPrimitive.SelectProps;

const ComboboxRoot = SelectPrimitive.Root;

type ComboboxValueProps = SelectPrimitive.SelectValueProps;

const ComboboxValue = SelectPrimitive.Value;

type ComboboxIconProps = SelectPrimitive.SelectIconProps;

const ComboboxIcon = SelectPrimitive.Icon;

type ComboboxPortalProps = SelectPrimitive.SelectPortalProps;

const ComboboxPortal = SelectPrimitive.Portal;

type ComboboxTriggerProps = ThemedClassName<TextInputProps>;

const ComboboxTrigger = forwardRef<HTMLInputElement, ComboboxTriggerProps>((props, forwardedRef) => {
  return <TextInput {...props} ref={forwardedRef} />;
});

type ComboboxContentProps = ThemedClassName<SelectPrimitive.SelectContentProps>;

const ComboboxContent = forwardRef<HTMLDivElement, ComboboxContentProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.Content
        {...props}
        className={tx('combobox.content', 'combobox__content', {}, classNames)}
        ref={forwardedRef}
      >
        {children}
      </SelectPrimitive.Content>
    );
  },
);

type ComboboxScrollUpButtonProps = ThemedClassName<SelectPrimitive.SelectScrollUpButtonProps>;

const ComboboxScrollUpButton = forwardRef<HTMLDivElement, ComboboxScrollUpButtonProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.SelectScrollUpButton
        {...props}
        className={tx('combobox.scrollButton', 'combobox__scroll-button--up', {}, classNames)}
        ref={forwardedRef}
      >
        {children ?? <CaretUp weight='bold' />}
      </SelectPrimitive.SelectScrollUpButton>
    );
  },
);

type ComboboxScrollDownButtonProps = ThemedClassName<SelectPrimitive.SelectScrollDownButtonProps>;

const ComboboxScrollDownButton = forwardRef<HTMLDivElement, ComboboxScrollDownButtonProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.SelectScrollDownButton
        {...props}
        className={tx('combobox.scrollButton', 'combobox__scroll-button--down', {}, classNames)}
        ref={forwardedRef}
      >
        {children ?? <CaretDown weight='bold' />}
      </SelectPrimitive.SelectScrollDownButton>
    );
  },
);

type ComboboxViewportProps = SelectPrimitive.SelectViewportProps;

const ComboboxViewport = SelectPrimitive.Viewport;

type ComboboxItemProps = ThemedClassName<SelectPrimitive.SelectItemProps>;

const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();
  return (
    <SelectPrimitive.Item {...props} className={tx('combobox.item', 'option', {}, classNames)} ref={forwardedRef} />
  );
});

type ComboboxItemTextProps = SelectPrimitive.SelectItemTextProps;

const ComboboxItemText = SelectPrimitive.ItemText;

type ComboboxItemIndicatorProps = ThemedClassName<SelectPrimitive.SelectItemIndicatorProps>;

const ComboboxItemIndicator = forwardRef<HTMLDivElement, ComboboxItemIndicatorProps>(
  ({ classNames, children, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.ItemIndicator
        {...props}
        className={tx('combobox.itemIndicator', 'option__indicator', {}, classNames)}
        ref={forwardedRef}
      >
        {children}
      </SelectPrimitive.ItemIndicator>
    );
  },
);

type ComboboxOptionProps = ComboboxItemProps;

const ComboboxOption = forwardRef<HTMLDivElement, ComboboxItemProps>(
  ({ children, classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();

    return (
      <SelectPrimitive.Item {...props} className={tx('combobox.item', 'option', {}, classNames)} ref={forwardedRef}>
        <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
        <SelectPrimitive.ItemIndicator className={tx('combobox.itemIndicator', 'option__indicator', {})}>
          <Check weight='bold' />
        </SelectPrimitive.ItemIndicator>
      </SelectPrimitive.Item>
    );
  },
);

type ComboboxGroupProps = SelectPrimitive.SelectGroupProps;

const ComboboxGroup = SelectPrimitive.Group;

type ComboboxLabelProps = SelectPrimitive.SelectLabelProps;

const ComboboxLabel = SelectPrimitive.Label;

type ComboboxSeparatorProps = ThemedClassName<SelectPrimitive.SelectSeparatorProps>;

const ComboboxSeparator = forwardRef<HTMLDivElement, ComboboxSeparatorProps>(
  ({ classNames, ...props }, forwardedRef) => {
    const { tx } = useThemeContext();
    return (
      <SelectPrimitive.Separator
        {...props}
        className={tx('combobox.separator', 'combobox__separator', {}, classNames)}
        ref={forwardedRef}
      />
    );
  },
);

type ComboboxArrowProps = ThemedClassName<SelectPrimitive.SelectArrowProps>;

const ComboboxArrow = forwardRef<SVGSVGElement, ComboboxArrowProps>(({ classNames, ...props }, forwardedRef) => {
  const { tx } = useThemeContext();

  return (
    <SelectPrimitive.Arrow
      {...props}
      className={tx('combobox.arrow', 'combobox__arrow', {}, classNames)}
      ref={forwardedRef}
    />
  );
});

export const Combobox = {
  Root: ComboboxRoot,
  Trigger: ComboboxTrigger,
  Value: ComboboxValue,
  Icon: ComboboxIcon,
  Portal: ComboboxPortal,
  Content: ComboboxContent,
  ScrollUpButton: ComboboxScrollUpButton,
  ScrollDownButton: ComboboxScrollDownButton,
  Viewport: ComboboxViewport,
  Item: ComboboxItem,
  ItemText: ComboboxItemText,
  ItemIndicator: ComboboxItemIndicator,
  Option: ComboboxOption,
  Group: ComboboxGroup,
  Label: ComboboxLabel,
  Separator: ComboboxSeparator,
  Arrow: ComboboxArrow,
};

export type {
  ComboboxRootProps,
  ComboboxTriggerProps,
  ComboboxValueProps,
  ComboboxIconProps,
  ComboboxPortalProps,
  ComboboxContentProps,
  ComboboxScrollUpButtonProps,
  ComboboxScrollDownButtonProps,
  ComboboxViewportProps,
  ComboboxItemProps,
  ComboboxItemTextProps,
  ComboboxItemIndicatorProps,
  ComboboxOptionProps,
  ComboboxGroupProps,
  ComboboxLabelProps,
  ComboboxSeparatorProps,
  ComboboxArrowProps,
};
