//
// Copyright 2022 DXOS.org
//

import * as PopoverPrimitive from '@radix-ui/react-popover';
import cx from 'classnames';
import { X } from 'phosphor-react';
import React, { ComponentProps, ReactNode, useCallback, useState } from 'react';

import { defaultFocus, defaultHover } from '../../styles';

export interface PopoverProps {
  openTrigger: ReactNode;
  closeLabel: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}

type KeyUpEvent = Parameters<
  Exclude<ComponentProps<typeof PopoverPrimitive.Trigger>['onKeyUp'], undefined>
>[0];

export const Popover = ({
  openTrigger,
  children,
  closeLabel,
  initiallyOpen
}: PopoverProps) => {
  const [isOpen, setIsOpen] = useState(!!initiallyOpen);
  const onKeyUp = useCallback((e: KeyUpEvent) => {
    if (
      (e.currentTarget as HTMLElement).dataset.keyupid === 'trigger' &&
      e.key === ' '
    ) {
      setIsOpen(true);
    }
  }, []);
  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Trigger
        asChild
        onKeyUp={onKeyUp}
        data-keyupid='trigger'
      >
        {openTrigger}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Content
        align='center'
        className={cx(
          'radix-side-top:animate-slide-up radix-side-bottom:animate-slide-down',
          'w-48 rounded-lg p-4 shadow-md md:w-56',
          'bg-white dark:bg-neutral-800'
        )}
      >
        <PopoverPrimitive.Arrow className='fill-current text-white dark:text-neutral-800' />
        {children}
        <PopoverPrimitive.Close
          className={cx(
            'absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-sm p-1',
            defaultFocus,
            defaultHover({})
          )}
          aria-label={closeLabel}
        >
          <X className='h-4 w-4 text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-400' />
        </PopoverPrimitive.Close>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  );
};
