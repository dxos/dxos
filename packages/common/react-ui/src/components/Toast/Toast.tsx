//
// Copyright 2022 DXOS.org
//

import * as ToastPrimitive from '@radix-ui/react-toast';
import React, { cloneElement, ComponentProps, ReactHTMLElement, ReactNode, useState } from 'react';

import { defaultDescription, defaultFocus } from '../../styles';
import { mx } from '../../util';
import { Button } from '../Button';

export interface ToastSlots {
  root?: Omit<ComponentProps<typeof ToastPrimitive.Root>, 'children'>;
  heading?: Omit<ComponentProps<'div'>, 'children'>;
  headingInner?: Omit<ComponentProps<'div'>, 'children'>;
  title?: Omit<ComponentProps<typeof ToastPrimitive.Title>, 'children'>;
  description?: Omit<ComponentProps<typeof ToastPrimitive.Description>, 'children'>;
  actions?: Omit<ComponentProps<'div'>, 'children'>;
}

export interface ToastProps extends Omit<ComponentProps<typeof ToastPrimitive.Root>, 'title'> {
  title: ReactNode;
  openTrigger?: string | Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  closeTrigger?: ReactNode;
  actionTriggers?: { altText: string; trigger: ReactNode }[];
  titleVisuallyHidden?: boolean;
  description?: ReactNode;
  initiallyOpen?: boolean;
  slots?: ToastSlots;
}

export const Toast = ({
  title,
  titleVisuallyHidden,
  description,
  openTrigger,
  closeTrigger,
  actionTriggers,
  initiallyOpen,
  slots = {}
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
        {...slots.root}
        className={mx(
          'shadow-lg rounded-lg elevated-buttons flex',
          'bg-white dark:bg-neutral-800',
          'radix-state-open:animate-toast-slide-in-bottom md:radix-state-open:animate-toast-slide-in-right',
          'radix-state-closed:animate-toast-hide',
          'radix-swipe-end:animate-toast-swipe-out',
          'translate-x-radix-toast-swipe-move-x',
          'radix-swipe-cancel:translate-x-0 radix-swipe-cancel:duration-200 radix-swipe-cancel:ease-[ease]',
          defaultFocus,
          slots.root?.className
        )}
      >
        <div
          role='none'
          {...slots.heading}
          className={mx('w-0 flex-1 flex items-center pl-5 py-4 min-h-full', slots.heading?.className)}
        >
          <div
            role='none'
            {...slots.headingInner}
            className={mx('w-full radix flex flex-col justify-center min-h-full gap-1', slots.headingInner?.className)}
          >
            <ToastPrimitive.Title className={mx('text-md font-medium', titleVisuallyHidden && 'sr-only')}>
              {title}
            </ToastPrimitive.Title>
            {description && (
              <ToastPrimitive.Description className={defaultDescription}>{description}</ToastPrimitive.Description>
            )}
          </div>
        </div>
        <div
          role='none'
          {...slots.actions}
          className={mx(
            'flex flex-col px-3 py-2 gap-1 items-stretch justify-center min-h-full',
            slots.actions?.className
          )}
        >
          {(actionTriggers || []).map(({ altText, trigger }, index) => (
            <ToastPrimitive.Action key={index} altText={altText} asChild={typeof trigger !== 'string'}>
              {trigger}
            </ToastPrimitive.Action>
          ))}
          {closeTrigger && (
            <ToastPrimitive.Close asChild={typeof closeTrigger !== 'string'}>{closeTrigger}</ToastPrimitive.Close>
          )}
        </div>
      </ToastPrimitive.Root>
    </>
  );
};
