//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/react-ui-theme';

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export const heading: Record<HeadingLevel, string> = {
  1: 'mbs-4 mbe-2 text-4xl font-semibold text-inherit no-underline',
  2: 'mbs-4 mbe-2 text-3xl font-bold text-inherit no-underline',
  3: 'mbs-4 mbe-2 text-2xl font-bold text-inherit no-underline',
  4: 'mbs-4 mbe-2 text-xl font-extrabold text-inherit no-underline',
  5: 'mbs-4 mbe-2 text-lg font-extrabold text-inherit no-underline',
  6: 'mbs-4 mbe-2 font-black text-inherit no-underline',
};

export const blockquote = 'mlb-2 border-is-4 border-neutral-500/50 pis-5';

// TODO(thure): Tailwind was not seeing `[&>li:before]:content-["•"]` as a utility class, but it would work if instead of `"•"` it was `"X"`… why?
export const unorderedList =
  'mlb-2 grid grid-cols-[min-content_1fr] [&>li:before]:content-[attr(marker)] [&>li:before]:mlb-1 [&>li:before]:mie-2';
export const orderedList =
  'mlb-2 grid grid-cols-[min-content_1fr]  [&>li:before]:content-[counters(section,_".")_"._"] [counter-reset:section] [&>li:before]:mlb-1';

export const listItem = 'contents before:[counter-increment:section]';

export const codeBlock = 'mlb-2 font-mono bg-neutral-500/10 p-3 rounded';

export const horizontalRule = 'mlb-4 border-neutral-500/50';

export const paragraph = 'mlb-1';

export const bold = 'font-bold';

export const code = 'font-mono bg-neutral-500/10 rounded pli-0.5 plb-0.5 -mlb-0.5';

export const placeholder = 'font-mono';

export const codeWithoutMarks = mx(code, 'pli-1.5 mli-0.5');

export const italic = 'italic';

export const strikethrough = 'line-through';

export const mark = '!font-normal !no-underline !text-inherit opacity-40';

export const link = 'text-primary-500 no-underline';
