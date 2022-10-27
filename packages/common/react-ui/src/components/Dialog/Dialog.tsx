//
// Copyright 2022 DXOS.org
//

import { Transition } from '@headlessui/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import cx from 'classnames';
import { X } from 'phosphor-react';
import React, { Fragment, ReactNode, useState } from 'react';

import { defaultDescription, defaultFocus, defaultHover } from '../../styles';
import { Tooltip } from '../Tooltip';

export interface DialogProps {
  title: ReactNode;
  openTrigger?: ReactNode;
  closeTriggers?: [ReactNode, ...ReactNode[]];
  titleVisuallyHidden?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
  initiallyOpen?: boolean;
  mountAsSibling?: boolean;
}

export const Dialog = ({
  title,
  titleVisuallyHidden,
  description,
  openTrigger,
  children,
  closeTriggers,
  closeLabel,
  initiallyOpen,
  mountAsSibling
}: DialogProps) => {
  const [isOpen, setIsOpen] = useState(!!initiallyOpen);

  const dialogOverlayAndContent = (
    <Transition.Root show={isOpen}>
      <Transition.Child
        as={Fragment}
        enter='ease-out duration-300'
        enterFrom='opacity-0'
        enterTo='opacity-100'
        leave='ease-in duration-200'
        leaveFrom='opacity-100'
        leaveTo='opacity-0'
      >
        <DialogPrimitive.Overlay
          forceMount
          className='fixed inset-0 z-20 bg-black/50'
        />
      </Transition.Child>
      <Transition.Child
        as={Fragment}
        enter='ease-out duration-300'
        enterFrom='opacity-0 scale-95'
        enterTo='opacity-100 scale-100'
        leave='ease-in duration-200'
        leaveFrom='opacity-100 scale-100'
        leaveTo='opacity-0 scale-95'
      >
        <DialogPrimitive.Content
          forceMount
          className={cx(
            'fixed z-50',
            'w-[95vw] max-w-md rounded-xl p-4 md:w-full',
            'top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
            'shadow-2xl bg-white dark:bg-neutral-800 elevated-buttons',
            defaultFocus
          )}
        >
          <DialogPrimitive.Title
            className={cx(
              'text-2xl font-display font-medium text-neutral-900 dark:text-neutral-100 rounded-md',
              titleVisuallyHidden && 'sr-only',
              defaultFocus
            )}
            tabIndex={0}
          >
            {title}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description
              className={cx('mt-2', defaultDescription)}
            >
              {description}
            </DialogPrimitive.Description>
          )}

          {children}

          {closeLabel && (
            <Tooltip content={closeLabel}>
              <DialogPrimitive.Close
                className={cx(
                  'absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-sm p-1',
                  defaultFocus,
                  defaultHover({})
                )}
              >
                <X className='h-4 w-4 text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-400' />
              </DialogPrimitive.Close>
            </Tooltip>
          )}
          {closeTriggers && (
            <div className='flex flex-wrap justify-end gap-4'>
              {closeTriggers.map((closeTrigger, key) => (
                <DialogPrimitive.Close key={key}>
                  {closeTrigger}
                </DialogPrimitive.Close>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </Transition.Child>
    </Transition.Root>
  );

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      {openTrigger && (
        <DialogPrimitive.Trigger asChild>{openTrigger}</DialogPrimitive.Trigger>
      )}
      {mountAsSibling ? (
        dialogOverlayAndContent
      ) : (
        <DialogPrimitive.Portal>
          {dialogOverlayAndContent}
        </DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
};
