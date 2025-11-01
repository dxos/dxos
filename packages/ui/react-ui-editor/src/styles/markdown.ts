//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/react-ui-theme';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

// https://tailwindcss.com/docs/font-weight
const headings: Record<HeadingLevel, string> = {
  1: 'text-4xl',
  2: 'text-3xl',
  3: 'text-2xl',
  4: 'text-xl',
  5: 'text-lg',
  6: '', // TODO(burdon): Should be text-base, but that's a color in our system.
};

export const theme = {
  code: 'font-mono !no-underline text-neutral-700 dark:text-neutral-300',
  codeMark: 'font-mono text-primary-500',
  mark: 'opacity-50',
  heading: (level: HeadingLevel) => {
    return mx(headings[level], 'dark:text-neutral-400');
  },
};
