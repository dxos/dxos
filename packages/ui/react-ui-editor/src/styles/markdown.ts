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
  6: 'text-md',
};

// TODO(burdon): Define theme as facet (used in multiple extensions).
// TODO(burdon): Organize theme styles for widgets.
export const theme = {
  mark: 'opacity-50',
  code: 'font-mono !no-underline text-neutral-700 dark:text-neutral-300',
  codeMark: 'font-mono text-primary-500',
  // TODO(burdon): Replace with widget.
  blockquote: 'pl-1 mr-1 border-is-4 border-orange-500 dark:border-orange-500 dark:text-neutral-500',
  heading: (level: HeadingLevel) => {
    return mx(headings[level], 'dark:text-primary-400');
  },
};
