//
// Copyright 2022 DXOS.org
//

import { mx } from '../util';

export const defaultActive = mx(
  'radix-state-open:outline-2 radix-state-open:outline-offset-1 radix-state-open:outline-primary-300 radix-state-open:outline-offset-transparent dark:radix-state-open:outline-primary-400 dark:radix-state-open:outline-offset-transparent',
  'radix-state-on:outline-2 radix-state-on:outline-offset-1 radix-state-on:outline-primary-300 radix-state-on:outline-offset-transparent dark:radix-state-on:outline-primary-400 dark:radix-state-on:outline-offset-transparent',
  'radix-state-instant-open:outline-2 radix-state-instant-open:outline-offset-1 radix-state-instant-open:outline-primary-300 radix-state-instant-open:outline-offset-transparent dark:radix-state-instant-open:outline-primary-400 dark:radix-state-instant-open:outline-offset-transparent'
);

const sideInset = {
  be: 'after:rounded-be after:bs-[2px] after:block-end-0 after:inline-start-0 after:inline-end-0'
};

export const osActive = (side: keyof typeof sideInset) =>
  mx(
    'relative after:content-[""] after:absolute after:bg-current after:opacity-0 after:transition-opacity after:duration-100 after:linear overflow-hidden',
    sideInset[side],
    'radix-state-open:after:opacity-100'
  );
