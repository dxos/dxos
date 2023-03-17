//
// Copyright 2022 DXOS.org
//

import { Transition } from '@headlessui/react';
import { X } from '@phosphor-icons/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import React, { ComponentProps, ComponentPropsWithoutRef, Fragment, ReactNode } from 'react';

import { defaultDescription, defaultFocus, hover, getSize } from '../../styles';
import { mx } from '../../util';
import { ElevationProvider } from '../ElevationProvider';
import { TooltipRoot, TooltipContent, TooltipTrigger } from '../Tooltip';
import { defaultOverlay } from './dialogStyles';

export interface DialogSlots {
  overlay?: Pick<ComponentProps<typeof DialogPrimitive.Overlay>, 'className'>;
  content?: Omit<ComponentProps<typeof DialogPrimitive.Content>, 'children'>;
  title?: Omit<ComponentProps<typeof DialogPrimitive.Content>, 'children'>;
  description?: Omit<ComponentProps<typeof DialogPrimitive.Description>, 'children'>;
  close?: Pick<ComponentProps<typeof DialogPrimitive.Close>, 'className'>;
  closeIcon?: ComponentProps<typeof X>;
  closeTriggers?: Omit<ComponentProps<'div'>, 'children'>;
}

export interface DialogProps
  extends Pick<ComponentPropsWithoutRef<typeof DialogPrimitive.Root>, 'open' | 'defaultOpen' | 'onOpenChange'> {
  title: ReactNode;
  openTrigger?: ReactNode;
  closeTriggers?: [ReactNode, ...ReactNode[]];
  titleVisuallyHidden?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  closeLabel?: string;
  mountAsSibling?: boolean;
  slots?: DialogSlots;
}

export const Dialog = ({
  title,
  titleVisuallyHidden,
  description,
  openTrigger,
  closeTriggers,
  children,
  closeLabel,
  mountAsSibling,
  open: propsOpen,
  defaultOpen: propsDefaultOpen,
  onOpenChange: propsOnOpenChange,
  slots = {}
}: DialogProps) => {
  const [open = false, setOpen] = useControllableState({
    prop: propsOpen,
    defaultProp: propsDefaultOpen,
    onChange: propsOnOpenChange
  });

  const dialogOverlayAndContent = (
    <Transition.Root show={open}>
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
          className={mx(defaultOverlay, slots.overlay?.className)}
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
          onOpenAutoFocus={(event) => event.preventDefault()}
          onCloseAutoFocus={(event) => event.preventDefault()}
          {...slots.content}
          className={mx(
            'flex flex-col',
            'fixed z-50',
            'w-[95vw] max-w-md rounded-xl p-4 md:w-full',
            'top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
            'shadow-2xl bg-white dark:bg-neutral-800 elevated-buttons',
            defaultFocus,
            slots.content?.className
          )}
        >
          <ElevationProvider elevation='chrome'>
            <DialogPrimitive.Title
              {...slots.title}
              className={mx(
                'shrink-0',
                'text-xl font-system-medium text-neutral-900 dark:text-neutral-100 rounded-md',
                titleVisuallyHidden && 'sr-only',
                defaultFocus,
                slots?.title?.className
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
              <TooltipRoot>
                <TooltipContent className='z-[51]'>{closeLabel}</TooltipContent>
                <TooltipTrigger asChild>
                  <DialogPrimitive.Close
                    className={mx(
                      'absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-sm p-1',
                      defaultFocus,
                      hover(),
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
                </TooltipTrigger>
              </TooltipRoot>
            )}
            {closeTriggers && (
              <div
                {...slots.closeTriggers}
                className={mx('flex flex-wrap justify-end gap-4', slots.closeTriggers?.className)}
              >
                {closeTriggers.map((closeTrigger, key) => (
                  <DialogPrimitive.Close key={key} asChild>
                    {closeTrigger}
                  </DialogPrimitive.Close>
                ))}
              </div>
            )}
          </ElevationProvider>
        </DialogPrimitive.Content>
      </Transition.Child>
    </Transition.Root>
  );

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {openTrigger && <DialogPrimitive.Trigger asChild>{openTrigger}</DialogPrimitive.Trigger>}
      {mountAsSibling ? (
        dialogOverlayAndContent
      ) : (
        <DialogPrimitive.Portal forceMount>{dialogOverlayAndContent}</DialogPrimitive.Portal>
      )}
    </DialogPrimitive.Root>
  );
};
