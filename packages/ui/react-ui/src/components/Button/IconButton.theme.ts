//
// Copyright 2022 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction, Theme } from '@dxos/ui-types';

import { type ButtonStyleProps } from './Button.theme';

export type IconButtonStyleProps = ButtonStyleProps & {
  iconOnly?: boolean;
  square?: boolean;
  caretDown?: boolean;
  compact?: boolean;
};

// No padding utility here: `utilities` is the last cascade layer, so a `px-*` would override the
// density-driven `padding-inline` on `.dx-button` at every density.
//
// An icon-only button is square, but only while it really holds one glyph: `caretDown` adds a
// second (the dropdown caret), and squaring that composite crushes both into one control width —
// as it did to the markdown toolbar's view selector. `aspect-square` pins the inline size, which
// stops the button stretching to a wider grid cell, so it is paired with `justify-self-center`;
// without that it silently left-aligns (what pushed the R0 rail's sidebar toggle 4px off-centre).
//
// `compact` is the one deliberate exception to the no-padding rule above: it opts out of the
// density-driven `padding-inline` so a run of icon buttons can sit tight against each other (a
// pager, say), and drops `aspect-square` with it — squaring a button with no inline padding would
// re-add the width the caller asked to remove. Block size is untouched, so the control still lines
// up with everything else on the row.
const root: ComponentFunction<IconButtonStyleProps> = ({ iconOnly, square, caretDown, compact }, ...etc) => {
  return mx(
    !iconOnly && 'gap-1.5',
    !compact && (square || (iconOnly && !caretDown)) && 'aspect-square justify-self-center',
    compact && 'px-0.5',
    ...etc,
  );
};

export const iconButtonTheme: Theme<IconButtonStyleProps> = {
  root,
};
