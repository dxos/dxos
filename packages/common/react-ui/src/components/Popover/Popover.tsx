//
// Copyright 2022 DXOS.org
//

import * as PopoverPrimitive from '@radix-ui/react-popover';
import cx from 'classnames';
import { X } from 'phosphor-react';
import React, { ComponentProps, ReactNode, useCallback, useState } from 'react';

import { defaultFocus, defaultHover } from '../../styles';

export interface PopoverProps
  extends Omit<ComponentProps<typeof PopoverPrimitive.Content>, 'children'> {
  openTrigger: ReactNode;
  children: ReactNode;
  closeLabel?: string;
  initiallyOpen?: boolean;
}

type KeyUpEvent = Parameters<
  Exclude<ComponentProps<typeof PopoverPrimitive.Trigger>['onKeyUp'], undefined>
>[0];

export const Popover = ({
  openTrigger,
  children,
  closeLabel,
  initiallyOpen,
  ...contentProps
}: PopoverProps) => {
  const [isOpen, setIsOpen] = useState(!!initiallyOpen);
  const onKeyUp = useCallback((e: KeyUpEvent) => {
    const keyUpId = (document.activeElement as HTMLElement).dataset.keyupid;
    if (keyUpId && e.key === ' ') {
      setIsOpen(keyUpId === 'open');
    }
  }, []);
  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger asChild onKeyUp={onKeyUp} data-keyupid='open'>
        {openTrigger}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content
        align='center'
        {...contentProps}
        className={cx(
          'radix-side-top:animate-slide-up radix-side-bottom:animate-slide-down',
          'rounded-lg p-4 shadow-lg elevated-buttons',
          'bg-white dark:bg-neutral-800',
          defaultFocus,
          contentProps.className
        )}
      >
        <PopoverPrimitive.Arrow className='fill-current text-white dark:text-neutral-800' />
        {children}
        {closeLabel && (
          <PopoverPrimitive.Close
            className={cx(
              'absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-sm p-1',
              defaultFocus,
              defaultHover({})
            )}
            aria-label={closeLabel}
            data-keyupid='close'
          >
            <X className='h-4 w-4 text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-400' />
          </PopoverPrimitive.Close>
        )}
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  );
};
