//
// Copyright 2026 DXOS.org
//

/**
 * Gap steps, named for the spacing ramp in `ui-theme/src/css/theme/spacing.css`
 * (4/8/12/16/24/32) plus the two semantic form aliases. Numeric Tailwind gaps (`gap-2`, `gap-3`) are
 * deliberately not members: the union steers callers onto the ramp. It does not fence them — a
 * `gap-*` literal passed through `classNames` still applies.
 */
export type Gap = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'form' | 'form-section';

export const gapClasses: Record<Gap, string> = {
  'none': 'gap-0',
  'xs': 'gap-trim-xs',
  'sm': 'gap-trim-sm',
  'md': 'gap-trim-md',
  'lg': 'gap-trim-lg',
  'xl': 'gap-trim-xl',
  '2xl': 'gap-trim-2xl',
  'form': 'gap-form-gap',
  'form-section': 'gap-form-section-gap',
};

export type Align = 'start' | 'center' | 'end' | 'baseline' | 'stretch';

export const alignClasses: Record<Align, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

export type Justify = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';

export const justifyClasses: Record<Justify, string> = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};
