//
// Copyright 2022 DXOS.org
//

import * as PopoverPrimitive from '@radix-ui/react-popover';
import { Button as ToolbarButtonItem } from '@radix-ui/react-toolbar';
import { X } from 'phosphor-react';
import React, { ComponentProps, ReactNode, useCallback, useState } from 'react';

import { defaultActive, defaultFocus, defaultHover, getSize } from '../../styles';
import { mx } from '../../util';

export interface PopoverSlots {
  content?: Omit<ComponentProps<typeof PopoverPrimitive.Content>, 'children'>;
  arrow?: Pick<ComponentProps<typeof PopoverPrimitive.Arrow>, 'className'>;
  close?: Omit<ComponentProps<typeof PopoverPrimitive.Close>, 'children'>;
  closeIcon?: ComponentProps<typeof X>;
  trigger?: Omit<ComponentProps<typeof PopoverPrimitive.Trigger>, 'children'>;
}

export interface PopoverProps {
  openTrigger: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  initiallyOpen?: boolean;
  mountAsSibling?: boolean;
  triggerIsInToolbar?: boolean;
  slots?: PopoverSlots;
}

type KeyUpEvent = Parameters<Exclude<ComponentProps<typeof PopoverPrimitive.Trigger>['onKeyUp'], undefined>>[0];

export const Popover = ({
  openTrigger,
  children,
  closeLabel,
  initiallyOpen,
  mountAsSibling,
  triggerIsInToolbar,
  slots = {}
}: PopoverProps) => {
  const [isOpen, setIsOpen] = useState(!!initiallyOpen);
  const onKeyUp = useCallback(
    (e: KeyUpEvent) => {
      const keyUpId = (document.activeElement as HTMLElement).dataset.keyupid;
      if (keyUpId && e.key === ' ') {
        setIsOpen(keyUpId === 'open');
      }
      slots.trigger?.onKeyUp?.(e);
    },
    [slots.trigger?.onKeyUp]
  );

  const popoverContent = (
    <PopoverPrimitive.Content
      align='center'
      {...slots.content}
      className={mx(
        'radix-side-top:animate-slide-up radix-side-bottom:animate-slide-down',
        'rounded-lg p-4 shadow-xl elevated-buttons',
        'bg-white dark:bg-neutral-800',
        defaultFocus,
        slots.content?.className
      )}
    >
      <PopoverPrimitive.Arrow className={mx('fill-current text-white dark:text-neutral-800', slots.arrow?.className)} />
      {children}
      {closeLabel && (
        <PopoverPrimitive.Close
          {...slots.close}
          className={mx(
            'absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-sm p-1',
            defaultFocus,
            defaultHover({}),
            slots.close?.className
          )}
          aria-label={closeLabel}
          data-keyupid='close'
        >
          <X
            {...slots.closeIcon}
            className={mx(
              getSize(4),
              'text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-400',
              slots.closeIcon?.className
            )}
          />
        </PopoverPrimitive.Close>
      )}
    </PopoverPrimitive.Content>
  );

  const trigger = (
    <PopoverPrimitive.Trigger
      {...slots.trigger}
      onKeyUp={onKeyUp}
      data-keyupid='open'
      className={mx(defaultHover({}), defaultFocus, defaultActive, slots.trigger?.className)}
    >
      {openTrigger}
    </PopoverPrimitive.Trigger>
  );

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      {triggerIsInToolbar ? <ToolbarButtonItem asChild>{trigger}</ToolbarButtonItem> : trigger}
      {mountAsSibling ? popoverContent : <PopoverPrimitive.Portal>{popoverContent}</PopoverPrimitive.Portal>}
    </PopoverPrimitive.Root>
  );
};
