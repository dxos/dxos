//
// Copyright 2026 DXOS.org
//

//
// The Neu (neumorphism) tokens: one ground tone per mode, the two shadow colours that raise or press a shape out of
// it, and the relief's geometry. The 2D Neu themes draw them through CSS variables and the 3D Neu themes read the same
// values, so both dimensions sit on the same ground in each mode.
//

import { type ThemeMode } from './style-set.ts';

/** The colours of the Neu ground in one mode. */
export type NeuPalette = {
  /** The ground every Neu shape and the background share, as `#rrggbb`. */
  readonly ground: string;
  /** The floor of a groove, as `#rrggbb`: a step darker than a light ground, lighter than a dark one so it reads. */
  readonly well: string;
  /** The light shadow cast up and to the left. */
  readonly highlight: string;
  /** The dark shadow cast down and to the right. */
  readonly shade: string;
};

// Light is the classic cool grey; dark is a blue-grey just above black, its shade deepened so the relief still reads
// and its grooves lifted, since a floor darker than near-black would vanish.
export const NEU_PALETTE: Readonly<Record<ThemeMode, NeuPalette>> = {
  light: {
    ground: '#e3e7ee',
    well: '#d8dde6',
    highlight: 'rgb(255 255 255 / 0.9)',
    shade: 'rgb(150 162 184 / 0.65)',
  },
  dark: {
    ground: '#15171b',
    well: '#30353e',
    highlight: 'rgb(255 255 255 / 0.12)',
    shade: 'rgb(0 0 0 / 0.75)',
  },
};

/** A shadow's offset along each axis and its blur, in scene px. */
export type NeuDepth = { readonly offset: number; readonly blur: number };

/** How a Neu shape meets the ground: `raised` stands out of it and `inset` is cut into it. */
export type NeuRelief = 'raised' | 'inset';

/** The geometry of each relief. */
export const NEU_RELIEF: Readonly<Record<NeuRelief, NeuDepth>> = {
  raised: { offset: 6, blur: 14 },
  inset: { offset: 4, blur: 8 },
};

/** The lit and shaded lip either side of a groove, as a fraction of the groove's width. */
export const NEU_GROOVE_LIP = 0.25;

/** The CSS variables the Neu surfaces, background and grooves draw with. */
export const NEU_VARS = {
  ground: '--dx-neu-ground',
  well: '--dx-neu-well',
  highlight: '--dx-neu-highlight',
  shade: '--dx-neu-shade',
  raised: '--dx-neu-raised',
  inset: '--dx-neu-inset',
} as const;

const lightDark = (key: keyof NeuPalette) => `light-dark(${NEU_PALETTE.light[key]}, ${NEU_PALETTE.dark[key]})`;

const px = (value: number) => `${Math.round(value * 100) / 100}px`;

/** A light shadow up-left and a dark one down-right; inset swaps which wall each falls on. */
const relief = ({ offset, blur }: NeuDepth, scale: number, inset: boolean): string => {
  const near = px(offset * scale);
  const far = px(-offset * scale);
  const spread = px(blur * scale);
  return inset
    ? `inset ${near} ${near} ${spread} var(${NEU_VARS.shade}), inset ${far} ${far} ${spread} var(${NEU_VARS.highlight})`
    : `${far} ${far} ${spread} var(${NEU_VARS.highlight}), ${near} ${near} ${spread} var(${NEU_VARS.shade})`;
};

/**
 * The Neu tokens as CSS variables, for an element whose descendants draw Neu surfaces. Colours are `light-dark()`
 * pairs, so they follow the colour scheme of the element that draws them: the app's, or a theme's forced mode. `scale`
 * shrinks the relief for a miniature, e.g. a picker swatch.
 */
export const neuVars = (scale = 1): Record<`--${string}`, string> => ({
  [NEU_VARS.ground]: lightDark('ground'),
  [NEU_VARS.well]: lightDark('well'),
  [NEU_VARS.highlight]: lightDark('highlight'),
  [NEU_VARS.shade]: lightDark('shade'),
  [NEU_VARS.raised]: relief(NEU_RELIEF.raised, scale, false),
  [NEU_VARS.inset]: relief(NEU_RELIEF.inset, scale, true),
});
