//
// Copyright 2022 DXOS.org
//

import * as ToastPrimitive from '@radix-ui/react-toast';
import cx from 'classnames';
import React, { cloneElement, ComponentProps, ReactHTMLElement, ReactNode, useState } from 'react';

import { defaultDescription, defaultFocus } from '../../styles';
import { Button } from '../Button';

export interface ToastProps extends Omit<ComponentProps<typeof ToastPrimitive.Root>, 'title'> {
  title: ReactNode;
  openTrigger?: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  closeTrigger?: ReactNode;
  actionTriggers?: { altText: string; trigger: ReactNode }[];
  titleVisuallyHidden?: boolean;
  description?: ReactNode;
  initiallyOpen?: boolean;
}

export const Toast = ({
  title,
  titleVisuallyHidden,
  description,
  openTrigger,
  closeTrigger,
  actionTriggers,
  initiallyOpen,
  ...rootProps
}: ToastProps) => {
  const [isOpen, setIsOpen] = useState(!!initiallyOpen);

  return (
    <>
      {openTrigger &&
        (typeof openTrigger === 'string' ? (
          <Button onClick={() => setIsOpen(true)}>{openTrigger}</Button>
        ) : (
          cloneElement(openTrigger as Omit<ReactHTMLElement<HTMLElement>, 'ref'>, { onClick: () => setIsOpen(true) })
        ))}
      <ToastPrimitive.Root
        open={isOpen}
        onOpenChange={setIsOpen}
        {...rootProps}
        className={cx(
          'shadow-lg rounded-lg',
          'bg-white dark:bg-neutral-800',
          'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
          'radix-state-closed:animate-toast-hide',
          'radix-swipe-end:animate-toast-swipe-out',
          'translate-x-radix-toast-swipe-move-x',
          'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-[ease]',
          'elevated-buttons',
          defaultFocus,
          rootProps.className
        )}
      >
        <div role='none' className='flex'>
          <div role='none' className='w-0 flex-1 flex items-center pl-5 py-4 min-h-full'>
            <div role='none' className='w-full radix flex flex-col justify-center min-h-full gap-1'>
              <ToastPrimitive.Title className={cx('text-md font-medium', titleVisuallyHidden && 'sr-only')}>
                {title}
              </ToastPrimitive.Title>
              {description && (
                <ToastPrimitive.Description className={defaultDescription}>{description}</ToastPrimitive.Description>
              )}
            </div>
          </div>
          <div role='none' className='flex flex-col px-3 py-2 gap-1 items-stretch justify-center min-h-full'>
            {(actionTriggers || []).map(({ altText, trigger }, index) => (
              <ToastPrimitive.Action key={index} altText={altText} asChild={typeof trigger !== 'string'}>
                {trigger}
              </ToastPrimitive.Action>
            ))}
            {closeTrigger && (
              <ToastPrimitive.Close asChild={typeof closeTrigger !== 'string'}>{closeTrigger}</ToastPrimitive.Close>
            )}
          </div>
        </div>
      </ToastPrimitive.Root>
    </>
  );
};
