//
// Copyright 2023 DXOS.org
//

import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { forwardRef } from 'react';

import {
  Popover,
  type PopoverArrowProps,
  type PopoverContentProps,
  type PopoverViewportProps,
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
} from '../components';

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
          classNames,
        }}
        id={modalId}
        ref={forwardedRef}
      >
        <Popover.Viewport>
          {/* TODO(thure): This skips over `Command`’s root component, which renders a DOM node probably unnecessarily without supporting `asChild`. */}
          <SearchList.Root {...props} classNames='contents' role='none'>
            {children}
          </SearchList.Root>
        </Popover.Viewport>
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

const PopoverComboboxInput = SearchList.Input;

type PopoverComboboxListProps = SearchListContentProps &
  Pick<PopoverViewportProps, 'constrainBlock' | 'constrainInline'>;

const PopoverComboboxList = forwardRef<HTMLDivElement, PopoverComboboxListProps>(
  ({ constrainInline, constrainBlock, ...props }, forwardedRef) => {
    return (
      <Popover.Viewport {...{ constrainInline, constrainBlock }}>
        <SearchList.Content {...props} ref={forwardedRef} />
      </Popover.Viewport>
    );
  },
);

type PopoverComboboxItemProps = SearchListItemProps;

const PopoverComboboxItem = SearchList.Item;

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
