//
// Copyright 2022 DXOS.org
//

import { Transition } from '@headlessui/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import cx from 'classnames';
import { X } from 'phosphor-react';
import React, {
  Fragment,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  useState
} from 'react';

export interface DialogProps {
  title: ReactNode
  description?: ReactNode
  trigger: ReactElement
  actions: [ReactElement, ...ReactElement[]]
}

export const Dialog = (props: PropsWithChildren<DialogProps>) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Trigger asChild>
        {props.trigger}
      </DialogPrimitive.Trigger>
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
              'w-[95vw] max-w-md rounded-lg p-4 md:w-full',
              'top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%]',
              'shadow-2xl bg-white dark:bg-neutral-800',
              'focus:outline-none focus-visible:ring focus-visible:ring-primary-500 focus-visible:ring-opacity-75'
            )}
          >
            <DialogPrimitive.Title
              className='text-sm font-medium text-neutral-900 dark:text-neutral-100'
            >
              {props.title}
            </DialogPrimitive.Title>

            {props.description && (
              <DialogPrimitive.Description
                className='mt-2 text-sm font-normal text-neutral-700 dark:text-neutral-400'
              >
                {props.description}
              </DialogPrimitive.Description>
            )}

            {props.children}

            <div className='mt-4 flex justify-end'>
              {props.actions.map((action, a) => (
                <DialogPrimitive.Close asChild key={a}>
                  {action}
                </DialogPrimitive.Close>
              ))}
            </div>

            <DialogPrimitive.Close
              aria-label='Close'
              className={cx(
                'absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-full p-1',
                'focus:outline-none focus-visible:ring focus-visible:ring-primary-500 focus-visible:ring-opacity-75'
              )}
            >
              <X
                className='h-4 w-4 text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-400'
              />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </Transition.Child>
      </Transition.Root>
    </DialogPrimitive.Root>
  );
};
