//
// Copyright 2022 DXOS.org
//

import * as ToastPrimitive from '@radix-ui/react-toast';
import cx from 'classnames';
import React, { cloneElement, ReactHTMLElement, ReactNode, useState } from 'react';

import { defaultFocus } from '../../styles';
import { Button } from '../Button';

export interface ToastProps {
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
  initiallyOpen
}: ToastProps) => {
  const [isOpen, setIsOpen] = useState(!!initiallyOpen);

  return (
    <>
      {openTrigger && typeof openTrigger === 'string' ? (
        <Button onClick={() => setIsOpen(true)}>{openTrigger}</Button>
      ) : (
        cloneElement(openTrigger as Omit<ReactHTMLElement<HTMLElement>, 'ref'>, { onClick: () => setIsOpen(true) })
      )}
      <ToastPrimitive.Root
        open={isOpen}
        onOpenChange={setIsOpen}
        className={cx(
          'shadow-lg rounded-lg',
          'bg-white dark:bg-neutral-800',
          'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
          'radix-state-closed:animate-toast-hide',
          'radix-swipe-end:animate-toast-swipe-out',
          'translate-x-radix-toast-swipe-move-x',
          'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-[ease]',
          'elevated-buttons',
          defaultFocus
        )}
      >
        <div role='none' className='flex'>
          <div role='none' className='w-0 flex-1 flex items-center pl-5 py-4'>
            <div role='none' className='w-full radix'>
              <ToastPrimitive.Title
                className={cx(
                  'text-sm font-medium text-neutral-900 dark:text-neutral-100',
                  titleVisuallyHidden && 'sr-only'
                )}
              >
                {title}
              </ToastPrimitive.Title>
              <ToastPrimitive.Description className='mt-1 text-sm text-neutral-700 dark:text-neutral-400'>
                {description}
              </ToastPrimitive.Description>
            </div>
          </div>
          <div role='none' className='flex'>
            <div role='none' className='flex flex-col px-3 py-2 gap-1 items-stretch'>
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
        </div>
      </ToastPrimitive.Root>
    </>
  );
};
