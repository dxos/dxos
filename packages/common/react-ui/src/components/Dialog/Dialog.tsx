//
// Copyright 2022 DXOS.org
//

import { Transition } from '@headlessui/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'phosphor-react';
import React, { ComponentProps, Fragment, ReactNode, useState } from 'react';

import { defaultDescription, defaultFocus, defaultHover, getSize } from '../../styles';
import { mx } from '../../util';
import { Tooltip } from '../Tooltip';

export interface DialogSlots {
  overlay?: Pick<ComponentProps<typeof DialogPrimitive.Overlay>, 'className'>;
  content?: Omit<ComponentProps<typeof DialogPrimitive.Content>, 'children'>;
  title?: Omit<ComponentProps<typeof DialogPrimitive.Content>, 'children'>;
  description?: Omit<ComponentProps<typeof DialogPrimitive.Description>, 'children'>;
  close?: Pick<ComponentProps<typeof DialogPrimitive.Close>, 'className'>;
  closeIcon?: ComponentProps<typeof X>;
  closeTriggers?: Omit<ComponentProps<'div'>, 'children'>;
}

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
  slots?: DialogSlots;
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
  mountAsSibling,
  slots = {}
}: DialogProps) => {
  const [isOpen, setIsOpen] = useState(!!initiallyOpen);

  const dialogOverlayAndContent = (
    <Transition.Root show={isOpen}>
      <Transition.Child
        as={Fragment}
        enter='linear duration-300'
        enterFrom='opacity-0'
        enterTo='opacity-100'
        leave='linear duration-200'
        leaveFrom='opacity-100'
        leaveTo='opacity-0'
      >
        <DialogPrimitive.Overlay
          forceMount
          {...slots.overlay}
          className={mx('fixed inset-0 z-20 bg-black/50', slots.overlay?.className)}
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
          {...slots.content}
          className={mx(
            'fixed z-50',
            'w-[95vw] max-w-md rounded-xl p-4 md:w-full',
            'top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
            'shadow-2xl bg-white dark:bg-neutral-800 elevated-buttons',
            defaultFocus,
            slots.content?.className
          )}
        >
          <DialogPrimitive.Title
            {...slots.title}
            className={mx(
              'text-2xl font-display font-medium text-neutral-900 dark:text-neutral-100 rounded-md',
              titleVisuallyHidden && 'sr-only',
              defaultFocus,
              slots.content?.className
            )}
            tabIndex={0}
          >
            {title}
          </DialogPrimitive.Title>
          {description && (
            <DialogPrimitive.Description
              {...slots.description}
              className={mx('mt-2', defaultDescription, slots.description?.className)}
            >
              {description}
            </DialogPrimitive.Description>
          )}

          {children}

          {closeLabel && (
            <Tooltip zIndex='z-[51]' content={closeLabel}>
              <DialogPrimitive.Close
                className={mx(
                  'absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-sm p-1',
                  defaultFocus,
                  defaultHover({}),
                  slots.close?.className
                )}
              >
                <X
                  className={mx(
                    getSize(4),
                    'text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-400',
                    slots.closeIcon?.className
                  )}
                />
              </DialogPrimitive.Close>
            </Tooltip>
          )}
          {closeTriggers && (
            <div
              {...slots.closeTriggers}
              className={mx('flex flex-wrap justify-end gap-4', slots.closeTriggers?.className)}
            >
              {closeTriggers.map((closeTrigger, key) => (
                <DialogPrimitive.Close key={key}>{closeTrigger}</DialogPrimitive.Close>
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </Transition.Child>
    </Transition.Root>
  );

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      {openTrigger && <DialogPrimitive.Trigger asChild>{openTrigger}</DialogPrimitive.Trigger>}
      {mountAsSibling ? (
        dialogOverlayAndContent
      ) : (
        <DialogPrimitive.Portal>{dialogOverlayAndContent}</DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
};
