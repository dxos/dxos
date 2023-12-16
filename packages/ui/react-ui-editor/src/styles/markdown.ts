//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/react-ui-theme';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

// https://tailwindcss.com/docs/font-weight
export const heading: Record<HeadingLevel, string> = {
  1: 'mbs-4 mbe-2 font-medium text-inherit no-underline text-4xl',
  2: 'mbs-4 mbe-2 font-medium text-inherit no-underline text-3xl',
  3: 'mbs-4 mbe-2 font-medium text-inherit no-underline text-2xl',
  4: 'mbs-4 mbe-2 font-medium text-inherit no-underline text-xl',
  5: 'mbs-4 mbe-2 font-medium text-inherit no-underline text-lg',
  6: 'mbs-4 mbe-2 font-medium text-inherit no-underline',
};

export const text = 'text-neutral-800 dark:text-neutral-200';
export const light = 'text-neutral-200 dark:text-neutral-800';

export const mark = mx('!font-normal !no-underline !text-inherit opacity-40', light);

export const paragraph = 'mlb-1';

export const bold = 'font-bold';
export const italic = 'italic';
export const strikethrough = 'line-through';

export const code = 'font-mono !no-underline text-neutral-700 dark:text-neutral-300';
export const codeMark = 'font-mono text-primary-500';
export const codeBlock = 'mlb-2 font-mono bg-neutral-500/10 p-3 rounded';

export const inlineUrl = mx(code, 'px-1');

// TODO(burdon): Replace with widget.
export const blockquote = mx('pl-1 mr-1 border-is-4 border-primary-500/70 dark:border-primary-500/30', light);

// TODO(burdon): Replace with widget.
export const horizontalRule = 'flex mlb-4 border-b text-neutral-100 dark:text-neutral-900 border-neutral-500/50';

// TODO(thure): Tailwind was not seeing `[&>li:before]:content-["•"]` as a utility class, but it would work if instead of `"•"` it was `"X"`… why?
export const unorderedList =
  'mlb-2 grid grid-cols-[min-content_1fr] [&>li:before]:content-[attr(marker)] [&>li:before]:mlb-1 [&>li:before]:mie-2';
export const orderedList =
  'mlb-2 grid grid-cols-[min-content_1fr] [&>li:before]:content-[counters(section,_".")_"._"] [counter-reset:section] [&>li:before]:mlb-1';

export const listItem = 'contents before:[counter-increment:section]';
