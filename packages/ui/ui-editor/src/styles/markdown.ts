//
// Copyright 2023 DXOS.org
//

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

// https://tailwindcss.com/docs/font-weight
const headings: Record<HeadingLevel, string> = {
  1: 'text-4xl',
  2: 'text-3xl',
  3: 'text-2xl',
  4: 'text-xl',
  5: 'text-lg',
  6: 'text-base',
};

export const markdownTheme = {
  code: 'font-mono no-underline! text-cm-code',
  codeMark: 'font-mono text-cm-code-mark',
  mark: 'opacity-50',
  heading: (level: HeadingLevel) => `${headings[level]} text-cm-heading`,
};
