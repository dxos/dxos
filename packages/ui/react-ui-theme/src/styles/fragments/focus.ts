//
// Copyright 2022 DXOS.org
//

import { mx } from '../../util';

// TODO(burdon): Add m-1/2 to make focusRing visible.

export const focusRing = mx(
  'focus:outline-none focus-visible:z-[1] focus-visible:hover:outline-none dark:focus-visible:hover:outline-none focus-visible:ring-2 focus-visible:ring-offset-0',
  'focus-visible:ring-primary-350 focus-visible:ring-offset-white dark:focus-visible:ring-primary-450 dark:focus-visible:ring-offset-black',
);

export const dropRing =
  'ring-1 ring-offset-0 ring-primary-350 ring-offset-white dark:ring-primary-450 dark:ring-offset-black';

export const dropRingInner =
  'before:z-10 before:absolute before:inset-0 before:ring-1 before:ring-inset before:ring-primary-350 before:dark:ring-primary-450';

export const subduedFocus = 'focus:outline-none focus-visible:outline-none focus:ring-0 ring-0 focus:border-0 border-0';

export const staticFocusRing =
  'ring-2 ring-offset-0 ring-primary-350 ring-offset-white dark:ring-primary-450 dark:ring-offset-black';
