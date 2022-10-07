//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React from 'react';

import { Dialog, Button } from '@dxos/react-ui';

export const App = () => {
  return (
    <main className='mt-8 px-8 inline-flex w-full flex-col space-y-4'>
      <Dialog title='Edit profile' description='Make changes to your profile here. Click save when you’re done.' trigger={<Button>Open dialog</Button>} actions={[<Button key='save' className={cx('shadow-sm bg-primary-700 hover:bg-primary-800 dark:bg-primary-300 dark:hover:bg-primary-200')}>Save</Button>]}>
        <form className='mt-2 space-y-2'>
          <fieldset>
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
      </Dialog>
    </main>
  );
};
