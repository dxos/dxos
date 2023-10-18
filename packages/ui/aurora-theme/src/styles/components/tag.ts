//
// Copyright 2023 DXOS.org
//

import {
  type ChromaticPalette,
  type ComponentFunction,
  type MessageValence,
  type NeutralPalette,
  type Theme,
} from '@dxos/aurora-types';

import { mx } from '../../util';

export type TagStyleProps = {
  palette?: ChromaticPalette | NeutralPalette | MessageValence;
};

const paletteColorMap: Record<Exclude<TagStyleProps['palette'], undefined>, string> = {
  neutral: 'bg-neutral-200 text-neutral-800 dark:bg-neutral-700 dark:text-neutral-150',
  red: 'bg-red-200 text-red-800 dark:bg-red-700 dark:text-red-150',
  orange: 'bg-orange-200 text-orange-800 dark:bg-orange-700 dark:text-orange-150',
  amber: 'bg-amber-200 text-amber-800 dark:bg-amber-700 dark:text-amber-150',
  yellow: 'bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-150',
  lime: 'bg-lime-200 text-lime-800 dark:bg-lime-700 dark:text-lime-150',
  green: 'bg-green-200 text-green-800 dark:bg-green-700 dark:text-green-150',
  emerald: 'bg-emerald-200 text-emerald-800 dark:bg-emerald-700 dark:text-emerald-150',
  teal: 'bg-teal-200 text-teal-800 dark:bg-teal-700 dark:text-teal-150',
  cyan: 'bg-cyan-200 text-cyan-800 dark:bg-cyan-700 dark:text-cyan-150',
  sky: 'bg-sky-200 text-sky-800 dark:bg-sky-700 dark:text-sky-150',
  blue: 'bg-blue-200 text-blue-800 dark:bg-blue-700 dark:text-blue-150',
  indigo: 'bg-indigo-200 text-indigo-800 dark:bg-indigo-700 dark:text-indigo-150',
  violet: 'bg-violet-200 text-violet-800 dark:bg-violet-700 dark:text-violet-150',
  purple: 'bg-purple-200 text-purple-800 dark:bg-purple-700 dark:text-purple-150',
  fuchsia: 'bg-fuchsia-200 text-fuchsia-800 dark:bg-fuchsia-700 dark:text-fuchsia-150',
  pink: 'bg-pink-200 text-pink-800 dark:bg-pink-700 dark:text-pink-150',
  rose: 'bg-rose-200 text-rose-800 dark:bg-rose-700 dark:text-rose-150',
  info: 'bg-info-200 text-info-800 dark:bg-info-700 dark:text-info-150',
  success: 'bg-success-200 text-success-800 dark:bg-success-700 dark:text-success-150',
  warning: 'bg-warning-200 text-warning-800 dark:bg-warning-700 dark:text-warning-150',
  error: 'bg-error-200 text-error-800 dark:bg-error-700 dark:text-error-150',
};

export const tagRoot: ComponentFunction<TagStyleProps> = ({ palette = 'neutral' }, ...etc) =>
  mx('text-xs font-semibold pli-2 plb-0.5 rounded cursor-default', paletteColorMap[palette], ...etc);

export const tagTheme: Theme<TagStyleProps> = {
  root: tagRoot,
};
