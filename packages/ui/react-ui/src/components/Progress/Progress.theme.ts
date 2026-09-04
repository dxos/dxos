//
// Copyright 2023 DXOS.org
//

import { mx } from '@dxos/ui-theme';
import type { ComponentFunction, Theme } from '@dxos/ui-types';

export type ProgressStyleProps = {
  indeterminate?: boolean;
  /** Draws the fill in the error colour, for a run that stopped where it got to. */
  error?: boolean;
};

const root: ComponentFunction<ProgressStyleProps> = (_props, ...etc) =>
  // A separator-derived track rather than a surface: the bar is drawn ON a surface, so a track
  // painted in one is invisible against its host.
  mx('block h-1 relative rounded-full overflow-hidden bg-separator', ...etc);

const bar: ComponentFunction<ProgressStyleProps> = ({ indeterminate, error }, ...etc) =>
  mx(
    'absolute inset-y-0 block rounded-full',
    error ? 'bg-error-surface' : 'bg-primary-surface',
    indeterminate
      ? 'animate-progress-indeterminate'
      : // Ease the width between updates so incremental advances glide rather than jump.
        'start-0 transition-[width] duration-200 ease-linear',
    ...etc,
  );

export const progressTheme: Theme<ProgressStyleProps> = {
  root,
  bar,
};
