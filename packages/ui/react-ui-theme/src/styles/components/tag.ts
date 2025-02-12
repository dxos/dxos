//
// Copyright 2023 DXOS.org
//

import {
  type ChromaticPalette,
  type ComponentFunction,
  type MessageValence,
  type NeutralPalette,
  type Theme,
} from '@dxos/react-ui-types';

import { mx } from '../../util';

export type TagStyleProps = {
  palette?: ChromaticPalette | NeutralPalette | MessageValence;
};

const paletteColorMap: Record<Exclude<TagStyleProps['palette'], undefined>, string> = {
  neutral: 'bg-separator text-neutral-700 dark:text-neutral-150',
  red: 'bg-redSurface text-redSurfaceText',
  orange: 'bg-orangeSurface text-orangeSurfaceText',
  amber: 'bg-amberSurface text-amberSurfaceText',
  yellow: 'bg-yellowSurface text-yellowSurfaceText',
  lime: 'bg-limeSurface text-limeSurfaceText',
  green: 'bg-greenSurface text-greenSurfaceText',
  emerald: 'bg-emeraldSurface text-emeraldSurfaceText',
  teal: 'bg-tealSurface text-tealSurfaceText',
  cyan: 'bg-cyanSurface text-cyanSurfaceText',
  sky: 'bg-skySurface text-skySurfaceText',
  blue: 'bg-blueSurface text-blueSurfaceText',
  indigo: 'bg-indigoSurface text-indigoSurfaceText',
  violet: 'bg-violetSurface text-violetSurfaceText',
  purple: 'bg-purpleSurface text-purpleSurfaceText',
  fuchsia: 'bg-fuchsiaSurface text-fuchsiaSurfaceText',
  pink: 'bg-pinkSurface text-pinkSurfaceText',
  rose: 'bg-roseSurface text-roseSurfaceText',
  info: 'bg-cyanSurface text-cyanSurfaceText',
  success: 'bg-emeraldSurface text-emeraldSurfaceText',
  warning: 'bg-amberSurface text-amberSurfaceText',
  error: 'bg-roseSurface text-roseSurfaceText',
};

export const tagRoot: ComponentFunction<TagStyleProps> = ({ palette = 'neutral' }, ...etc) =>
  mx(
    'text-xs font-semibold pli-2 plb-0.5 rounded user-select-none cursor-default truncate',
    paletteColorMap[palette],
    ...etc,
  );

export const tagTheme: Theme<TagStyleProps> = {
  root: tagRoot,
};
