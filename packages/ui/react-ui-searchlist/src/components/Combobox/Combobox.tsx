//
// Copyright 2023 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { type PropsWithChildren, forwardRef, useCallback } from 'react';

import {
  Button,
  type ButtonProps,
  Icon,
  Popover,
  type PopoverArrowProps,
  type PopoverContentProps,
  type PopoverVirtualTriggerProps,
} from '@dxos/react-ui';
import { useId } from '@dxos/react-ui';
import { mx, staticPlaceholderText } from '@dxos/ui-theme';

import {
  SearchList,
  type SearchListContentProps,
  type SearchListEmptyProps,
  type SearchListInputProps,
  type SearchListItemProps,
  type SearchListRootProps,
} from '../SearchList';

const COMBOBOX_NAME = 'Combobox';
const COMBOBOX_CONTENT_NAME = 'ComboboxContent';
const COMBOBOX_ITEM_NAME = 'ComboboxItem';
const COMBOBOX_TRIGGER_NAME = 'ComboboxTrigger';

//
// Context
//

type ComboboxContextValue = {
  modalId: string;
  isCombobox: true;
  placeholder?: string;
  open: boolean;
  onOpenChange: (nextOpen: boolean) => void;
  value: string;
  onValueChange: (nextValue: string) => void;
};

const [ComboboxProvider, useComboboxContext] = createContext<Partial<ComboboxContextValue>>(COMBOBOX_NAME, {});

//
// Root
//

type ComboboxRootProps = PropsWithChildren<
  Partial<ComboboxContextValue & { modal: boolean; defaultOpen: boolean; defaultValue: string; placeholder: string }>
>;

const ComboboxRoot = ({
  modal,
  modalId: propsModalId,
  open: propsOpen,
  defaultOpen,
  onOpenChange: propsOnOpenChange,
  value: propsValue,
  defaultValue,
  onValueChange: propsOnValueChange,
  placeholder,
  children,
}: ComboboxRootProps) => {
  const modalId = useId(COMBOBOX_NAME, propsModalId);
  const [open = false, onOpenChange] = useControllableState({
    prop: propsOpen,
    onChange: propsOnOpenChange,
    defaultProp: defaultOpen,
  });
  const [value = '', onValueChange] = useControllableState({
    prop: propsValue,
    onChange: propsOnValueChange,
    defaultProp: defaultValue,
  });

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <ComboboxProvider
        isCombobox
        modalId={modalId}
        placeholder={placeholder}
        open={open}
        onOpenChange={onOpenChange}
        value={value}
        onValueChange={onValueChange}
      >
        {children}
      </ComboboxProvider>
    </Popover.Root>
  );
};

//
// ContentProps
//

type ComboboxContentProps = SearchListRootProps & PopoverContentProps;

const ComboboxContent = forwardRef<HTMLDivElement, ComboboxContentProps>(
  (
    {
      side = 'bottom',
      collisionPadding = 48,
      sideOffset,
      align,
      alignOffset,
      avoidCollisions,
      collisionBoundary,
      arrowPadding,
      sticky,
      hideWhenDetached,
      onOpenAutoFocus,
      onCloseAutoFocus,
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      onInteractOutside,
      forceMount,
      children,
      classNames,
      ...props
    },
    forwardedRef,
  ) => {
    const { modalId } = useComboboxContext(COMBOBOX_CONTENT_NAME);

    return (
      <Popover.Content
        {...{
          side,
          sideOffset,
          align,
          alignOffset,
          avoidCollisions,
          collisionBoundary,
          collisionPadding,
          arrowPadding,
          sticky,
          hideWhenDetached,
          onOpenAutoFocus,
          onCloseAutoFocus,
          onEscapeKeyDown,
          onPointerDownOutside,
          onFocusOutside,
          onInteractOutside,
          forceMount,
        }}
        classNames={[
          'is-[--radix-popover-trigger-width] max-bs-[--radix-popover-content-available-height] grid grid-rows-[min-content_1fr]',
          classNames,
        ]}
        id={modalId}
        ref={forwardedRef}
      >
        <SearchList.Root {...props} classNames='contents density-fine' role='none'>
          {children}
        </SearchList.Root>
      </Popover.Content>
    );
  },
);

ComboboxContent.displayName = COMBOBOX_CONTENT_NAME;

//
// Trigger
//

type ComboboxTriggerProps = ButtonProps;

const ComboboxTrigger = forwardRef<HTMLButtonElement, ComboboxTriggerProps>(
  ({ children, onClick, ...props }, forwardedRef) => {
    const { modalId, open, onOpenChange, placeholder, value } = useComboboxContext(COMBOBOX_TRIGGER_NAME);
    const handleClick = useCallback(
      (event: Parameters<Exclude<ButtonProps['onClick'], undefined>>[0]) => {
        onClick?.(event);
        onOpenChange?.(true);
      },
      [onClick, onOpenChange],
    );

    return (
      <Popover.Trigger asChild>
        <Button
          {...props}
          role='combobox'
          aria-expanded={open}
          aria-controls={modalId}
          aria-haspopup='dialog'
          onClick={handleClick}
          ref={forwardedRef}
        >
          {children ?? (
            <>
              <span
                className={mx('font-normal text-start flex-1 min-is-0 truncate mie-2', !value && staticPlaceholderText)}
              >
                {value || placeholder}
              </span>
              <Icon icon='ph--caret-down--bold' size={3} />
            </>
          )}
        </Button>
      </Popover.Trigger>
    );
  },
);

ComboboxTrigger.displayName = COMBOBOX_TRIGGER_NAME;

//
// VirtualTrigger
//

type ComboboxVirtualTriggerProps = PopoverVirtualTriggerProps;

const ComboboxVirtualTrigger = Popover.VirtualTrigger;

//
// Input
//

type ComboboxInputProps = SearchListInputProps;

const ComboboxInput = forwardRef<HTMLInputElement, ComboboxInputProps>(({ classNames, ...props }, forwardedRef) => {
  return (
    <SearchList.Input
      {...props}
      classNames={[
        'mli-cardSpacingChrome mbs-cardSpacingChrome mbe-0 is-[calc(100%-2*var(--dx-cardSpacingChrome))]',
        classNames,
      ]}
      ref={forwardedRef}
    />
  );
});

//
// List
//

type ComboboxListProps = SearchListContentProps;

const ComboboxList = forwardRef<HTMLDivElement, ComboboxListProps>(({ classNames, ...props }, forwardedRef) => {
  return (
    <SearchList.Content
      {...props}
      classNames={['min-bs-0 overflow-y-auto plb-cardSpacingChrome', classNames]}
      ref={forwardedRef}
    />
  );
});

//
// Item
//

type ComboboxItemProps = SearchListItemProps;

const ComboboxItem = forwardRef<HTMLDivElement, ComboboxItemProps>(
  ({ classNames, onSelect, ...props }, forwardedRef) => {
    const { onValueChange, onOpenChange } = useComboboxContext(COMBOBOX_ITEM_NAME);
    const handleSelect = useCallback<NonNullable<SearchListItemProps['onSelect']>>(
      (nextValue) => {
        onSelect?.(nextValue);
        onValueChange?.(nextValue);
        onOpenChange?.(false);
      },
      [onSelect, onValueChange, onOpenChange],
    );

    return (
      <SearchList.Item
        {...props}
        classNames={['mli-cardSpacingChrome pli-cardSpacingChrome', classNames]}
        onSelect={handleSelect}
        ref={forwardedRef}
      />
    );
  },
);

ComboboxItem.displayName = COMBOBOX_ITEM_NAME;

//
// Arrow
//

type ComboboxArrowProps = PopoverArrowProps;

const ComboboxArrow = Popover.Arrow;

//
// Empty
//

type ComboboxEmptyProps = SearchListEmptyProps;

const ComboboxEmpty = SearchList.Empty;

//
// Combobox
// https://www.w3.org/WAI/ARIA/apg/patterns/combobox
//

export const Combobox = {
  Root: ComboboxRoot,
  Content: ComboboxContent,
  Trigger: ComboboxTrigger,
  VirtualTrigger: ComboboxVirtualTrigger,
  Input: ComboboxInput,
  List: ComboboxList,
  Item: ComboboxItem,
  Arrow: ComboboxArrow,
  Empty: ComboboxEmpty,
};

export type {
  ComboboxRootProps,
  ComboboxContentProps,
  ComboboxTriggerProps,
  ComboboxVirtualTriggerProps,
  ComboboxInputProps,
  ComboboxListProps,
  ComboboxItemProps,
  ComboboxArrowProps,
  ComboboxEmptyProps,
};
