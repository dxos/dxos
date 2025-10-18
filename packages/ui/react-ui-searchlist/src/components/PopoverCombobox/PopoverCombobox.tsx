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
  Combobox,
  type ComboboxRootProps,
  type ComboboxTriggerProps,
  SearchList,
  type SearchListContentProps,
  type SearchListEmptyProps,
  type SearchListInputProps,
  type SearchListItemProps,
  type SearchListRootProps,
} from '../SearchList';

type PopoverComboboxRootProps = ComboboxRootProps & { modal?: boolean };

const PopoverComboboxRoot = ({
  modal,
  children,
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
  defaultOpen,
  ...props
}: PopoverComboboxRootProps) => {
  const [open, onOpenChange] = useControllableState({
    prop: propsOpen,
    onChange: propsOnOpenChange,
    defaultProp: defaultOpen,
  });
  return (
    <Combobox.Root open={open} onOpenChange={onOpenChange} {...props}>
      <Popover.Root open={open} onOpenChange={onOpenChange} modal={modal}>
        {children}
      </Popover.Root>
    </Combobox.Root>
  );
};

type PopoverComboboxContentProps = SearchListRootProps & PopoverContentProps;

const POPOVER_COMBOBOX_CONTENT_NAME = 'PopoverComboboxContent';

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
    const { modalId } = Combobox.useComboboxContext(POPOVER_COMBOBOX_CONTENT_NAME);
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

type PopoverComboboxTriggerProps = ComboboxTriggerProps;

const PopoverComboboxTrigger = forwardRef<HTMLButtonElement, PopoverComboboxTriggerProps>((props, forwardedRef) => {
  return (
    <Popover.Trigger asChild>
      <Combobox.Trigger {...props} ref={forwardedRef} />
    </Popover.Trigger>
  );
});

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

type PopoverComboboxArrowProps = PopoverArrowProps;

const PopoverComboboxArrow = Popover.Arrow;

type PopoverComboboxEmptyProps = SearchListEmptyProps;

const PopoverComboboxEmpty = SearchList.Empty;

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
