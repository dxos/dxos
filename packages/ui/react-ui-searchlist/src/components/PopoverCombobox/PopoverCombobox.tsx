//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { forwardRef } from 'react';

import {
  Popover,
  type PopoverArrowProps,
  type PopoverContentProps,
  type PopoverVirtualTriggerProps,
} from '@dxos/react-ui';

import {
  SearchList,
  type SearchListContentProps,
  type SearchListEmptyProps,
  type SearchListInputProps,
  type SearchListItemProps,
  SearchListProvider,
  type SearchListRootProps,
} from '../SearchList';

import { Combobox, type ComboboxRootProps, type ComboboxTriggerProps, useComboboxContext } from './Combobox';

//
// Root
//

type PopoverComboboxRootProps = ComboboxRootProps & { modal?: boolean };

const PopoverComboboxRoot = ({
  modal,
  children,
  open: openParam,
  defaultOpen,
  onOpenChange: onOpenChangeParam,
  ...props
}: PopoverComboboxRootProps) => {
  const [open, onOpenChange] = useControllableState({
    prop: openParam,
    onChange: onOpenChangeParam,
    defaultProp: defaultOpen,
  });

  console.log(props.onValueChange);

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <Combobox.Root open={open} onOpenChange={onOpenChange} {...props}>
        <SearchListProvider onOpenChange={onOpenChange} onValueChange={props.onValueChange}>
          {children}
        </SearchListProvider>
      </Combobox.Root>
    </Popover.Root>
  );
};

//
// ContentProps
//

const POPOVER_COMBOBOX_CONTENT_NAME = 'PopoverComboboxContent';

type PopoverComboboxContentProps = SearchListRootProps & PopoverContentProps;

const PopoverComboboxContent = forwardRef<HTMLDivElement, PopoverComboboxContentProps>(
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
    const { modalId } = useComboboxContext(POPOVER_COMBOBOX_CONTENT_NAME);
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

PopoverComboboxContent.displayName = POPOVER_COMBOBOX_CONTENT_NAME;

//
// Trigger
//

type PopoverComboboxTriggerProps = ComboboxTriggerProps;

const PopoverComboboxTrigger = forwardRef<HTMLButtonElement, PopoverComboboxTriggerProps>((props, forwardedRef) => {
  return (
    <Popover.Trigger asChild>
      <Combobox.Trigger {...props} ref={forwardedRef} />
    </Popover.Trigger>
  );
});

//
// VirtualTrigger
//

type PopoverComboboxVirtualTriggerProps = PopoverVirtualTriggerProps;

const PopoverComboboxVirtualTrigger = Popover.VirtualTrigger;

type PopoverComboboxInputProps = SearchListInputProps;

const PopoverComboboxInput = forwardRef<HTMLInputElement, PopoverComboboxInputProps>(
  ({ classNames, ...props }, forwardedRef) => {
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
  },
);

//
// List
//

type PopoverComboboxListProps = SearchListContentProps;

const PopoverComboboxList = forwardRef<HTMLDivElement, PopoverComboboxListProps>(
  ({ classNames, ...props }, forwardedRef) => {
    return (
      <SearchList.Content
        {...props}
        classNames={['min-bs-0 overflow-y-auto plb-cardSpacingChrome', classNames]}
        ref={forwardedRef}
      />
    );
  },
);

//
// Item
//

type PopoverComboboxItemProps = SearchListItemProps;

const PopoverComboboxItem = forwardRef<HTMLDivElement, PopoverComboboxItemProps>(
  ({ classNames, ...props }, forwardedRef) => {
    return (
      <SearchList.Item
        {...props}
        classNames={['mli-cardSpacingChrome pli-cardSpacingChrome', classNames]}
        ref={forwardedRef}
      />
    );
  },
);

//
// Arrow
//

type PopoverComboboxArrowProps = PopoverArrowProps;

const PopoverComboboxArrow = Popover.Arrow;

//
// Empty
//

type PopoverComboboxEmptyProps = SearchListEmptyProps;

const PopoverComboboxEmpty = SearchList.Empty;

//
// PopoverCombobox
//

export const PopoverCombobox = {
  Root: PopoverComboboxRoot,
  Content: PopoverComboboxContent,
  Trigger: PopoverComboboxTrigger,
  VirtualTrigger: PopoverComboboxVirtualTrigger,
  Input: PopoverComboboxInput,
  List: PopoverComboboxList,
  Item: PopoverComboboxItem,
  Arrow: PopoverComboboxArrow,
  Empty: PopoverComboboxEmpty,
};

export type {
  PopoverComboboxRootProps,
  PopoverComboboxContentProps,
  PopoverComboboxTriggerProps,
  PopoverComboboxVirtualTriggerProps,
  PopoverComboboxInputProps,
  PopoverComboboxListProps,
  PopoverComboboxItemProps,
  PopoverComboboxArrowProps,
  PopoverComboboxEmptyProps,
};
