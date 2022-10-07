//
// Copyright 2022 DXOS.org
//

import { Transition } from '@headlessui/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import cx from 'classnames';
import { X } from 'phosphor-react';
import React, { Fragment, useState } from 'react';

import { Button } from './Button';

export const Dialog = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <DialogPrimitive.Trigger asChild>
        <Button>Open dialog</Button>
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
            <DialogPrimitive.Title className='text-sm font-medium text-neutral-900 dark:text-neutral-100'>
              Edit profile
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className='mt-2 text-sm font-normal text-neutral-700 dark:text-neutral-400'>
              Make changes to your profile here. Click save when you&apos;re
              done.
            </DialogPrimitive.Description>
            <form className='mt-2 space-y-2'>
              <fieldset>
                {/* <legend>Choose your favorite monster</legend> */}
                <label
                  htmlFor='firstName'
                  className='text-xs font-medium text-neutral-700 dark:text-neutral-400'
                >
                  First Name
                </label>
                <input
                  id='firstName'
                  type='text'
                  placeholder='Tim'
                  autoComplete='given-name'
                  className={cx(
                    'mt-1 block w-full rounded-md',
                    'text-sm text-neutral-700 placeholder:text-neutral-500 dark:text-neutral-400 dark:placeholder:text-neutral-600',
                    'border border-neutral-400 focus-visible:border-transparent dark:border-neutral-700 dark:bg-neutral-800',
                    'focus:outline-none focus-visible:ring focus-visible:ring-primary-500 focus-visible:ring-opacity-75'
                  )}
                />
              </fieldset>
              <fieldset>
                <label
                  htmlFor='familyName'
                  className='text-xs font-medium text-neutral-700 dark:text-neutral-400'
                >
                  Family Name
                </label>
                <input
                  id='familyName'
                  type='text'
                  placeholder='Cook'
                  autoComplete='family-name'
                  className={cx(
                    'mt-1 block w-full rounded-md',
                    'text-sm text-neutral-700 placeholder:text-neutral-500 dark:text-neutral-400 dark:placeholder:text-neutral-600',
                    'border border-neutral-400 focus-visible:border-transparent dark:border-neutral-700 dark:bg-neutral-800',
                    'focus:outline-none focus-visible:ring focus-visible:ring-primary-500 focus-visible:ring-opacity-75'
                  )}
                />
              </fieldset>
            </form>

            <div className='mt-4 flex justify-end'>
              <DialogPrimitive.Close
                className={cx(
                  'inline-flex select-none justify-center rounded-md px-4 py-2 text-sm font-medium',
                  'shadow-md bg-primary-700 text-white hover:bg-primary-800 dark:bg-primary-600 dark:text-black dark:hover:bg-primary-500',
                  'border border-transparent',
                  'focus:outline-none focus-visible:ring focus-visible:ring-primary-500 focus-visible:ring-opacity-75'
                )}
              >
                Save & close
              </DialogPrimitive.Close>
            </div>

            <DialogPrimitive.Close
              className={cx(
                'absolute top-3.5 right-3.5 inline-flex items-center justify-center rounded-full p-1',
                'focus:outline-none focus-visible:ring focus-visible:ring-primary-500 focus-visible:ring-opacity-75'
              )}
            >
              <X className='h-4 w-4 text-neutral-500 hover:text-neutral-700 dark:text-neutral-500 dark:hover:text-neutral-400' />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </Transition.Child>
      </Transition.Root>
    </DialogPrimitive.Root>
  );
};
