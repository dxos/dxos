//
// Copyright 2022 DXOS.org
//

import { Transition } from '@headlessui/react';
import * as AlertDialogPrimitive from '@radix-ui/react-alert-dialog';
import React, { cloneElement, ComponentProps, Fragment, ReactHTMLElement, ReactNode, useEffect, useState } from 'react';

import { Input, InputProps, defaultDescription, defaultFocus, mx } from '@dxos/react-components';

export interface AlertDialogSlots {
  overlay?: Pick<ComponentProps<typeof AlertDialogPrimitive.Overlay>, 'className'>;
  content?: Omit<ComponentProps<typeof AlertDialogPrimitive.Content>, 'children'>;
  title?: Omit<ComponentProps<typeof AlertDialogPrimitive.Content>, 'children'>;
  description?: Omit<ComponentProps<typeof AlertDialogPrimitive.Description>, 'children'>;
  actions?: Omit<ComponentProps<'div'>, 'children'>;
}

export interface AlertDialogProps {
  title: ReactNode;
  openTrigger?: ReactNode;
  cancelTrigger?: ReactNode;
  confirmTrigger: Omit<ReactHTMLElement<HTMLElement>, 'ref'>;
  destructiveConfirmString?: string;
  destructiveConfirmInputProps?: Omit<InputProps, 'onChange' | 'initialValue'>;
  titleVisuallyHidden?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  initiallyOpen?: boolean;
  mountAsSibling?: boolean;
  slots?: AlertDialogSlots;
}

export const AlertDialog = ({
  title,
  titleVisuallyHidden,
  description,
  openTrigger,
  cancelTrigger,
  confirmTrigger,
  destructiveConfirmString,
  destructiveConfirmInputProps,
  children,
  initiallyOpen,
  mountAsSibling,
  slots = {}
}: AlertDialogProps) => {
  const [isOpen, setIsOpen] = useState(!!initiallyOpen);
  const [confirmDisabled, setConfirmDisabled] = useState(!!destructiveConfirmString);
  const [confirmStringValue, setConfirmStringValue] = useState('');

  useEffect(() => {
    if (destructiveConfirmString) {
      setConfirmDisabled(confirmStringValue !== destructiveConfirmString);
    }
  }, [confirmStringValue]);

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
        <AlertDialogPrimitive.Overlay
          forceMount
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
        <AlertDialogPrimitive.Content
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
          <AlertDialogPrimitive.Title
            tabIndex={0}
            {...slots.title}
            className={mx(
              'text-2xl font-display font-medium text-neutral-900 dark:text-neutral-100 rounded-md',
              titleVisuallyHidden && 'sr-only',
              defaultFocus,
              slots.title?.className
            )}
          >
            {title}
          </AlertDialogPrimitive.Title>
          {description && (
            <AlertDialogPrimitive.Description
              {...slots.description}
              className={mx('my-2', defaultDescription, slots.description?.className)}
            >
              {description}
            </AlertDialogPrimitive.Description>
          )}

          {children}

          {destructiveConfirmInputProps && <Input {...destructiveConfirmInputProps} onChange={setConfirmStringValue} />}

          <div {...slots.actions} className={mx('flex flex-wrap justify-end gap-4', slots.actions?.className)}>
            {cancelTrigger && (
              <AlertDialogPrimitive.Cancel asChild={typeof cancelTrigger !== 'string'}>
                {cancelTrigger}
              </AlertDialogPrimitive.Cancel>
            )}
            <AlertDialogPrimitive.Action asChild>
              {cloneElement(confirmTrigger, { disabled: confirmDisabled })}
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </Transition.Child>
    </Transition.Root>
  );

  return (
    <AlertDialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      {openTrigger && <AlertDialogPrimitive.Trigger asChild>{openTrigger}</AlertDialogPrimitive.Trigger>}
      {mountAsSibling ? (
        dialogOverlayAndContent
      ) : (
        <AlertDialogPrimitive.Portal>{dialogOverlayAndContent}</AlertDialogPrimitive.Portal>
      )}
    </AlertDialogPrimitive.Root>
  );
};
