//
// Copyright 2024 DXOS.org
//

// TODO(thure): TS2742 at it again
/* eslint-disable unused-imports/no-unused-imports */
import * as _colors from '@ch-ui/colors';

import { type ColorAliases, type ColorSememes } from './types';

// TODO(burdon): Move to util.
const getMapValue = <T>(map: Record<string, T>, key: string, defaultValue: () => T): T => {
  let value = map[key];
  if (!value) {
    value = defaultValue();
    map[key] = value;
  }
  return value;
};

type Sememe = ColorSememes[string];

const applyAlpha = (sememe: Sememe, alpha: number): Sememe => {
  return {
    light: [sememe.light![0], `${sememe.light![1]}/${alpha}`],
    dark: [sememe.dark![0], `${sememe.dark![1]}/${alpha}`],
  };
};

// Surface cadence sememes (in contrast-order)

const STEPS = 8;

const DARK_MIN = 850;
const DARK_MAX = 700;
const darkCadence = (step: number) => Math.floor(DARK_MIN + (DARK_MAX - DARK_MIN) * (step / STEPS));

const LIGHT_MIN = 10;
const LIGHT_MAX = 180;
const lightCadence = (step: number) => Math.floor(LIGHT_MIN + (LIGHT_MAX - LIGHT_MIN) * (step / STEPS));

const surface: Record<string, Sememe> = {
  '0': {
    light: ['neutral', lightCadence(0)],
    dark: ['neutral', darkCadence(0)],
  },
  '10': {
    light: ['neutral', lightCadence(0.8)],
    dark: ['neutral', darkCadence(0.8)],
  },
  '20': {
    light: ['neutral', lightCadence(1.6)],
    dark: ['neutral', darkCadence(1.6)],
  },
  '30': {
    light: ['neutral', lightCadence(2.8)],
    dark: ['neutral', darkCadence(3)],
  },
  '40': {
    light: ['neutral', lightCadence(4)],
    dark: ['neutral', darkCadence(4)],
  },
  '50': {
    light: ['neutral', lightCadence(5)],
    dark: ['neutral', darkCadence(5)],
  },
  '60': {
    light: ['neutral', lightCadence(6)],
    dark: ['neutral', darkCadence(6)],
  },
  '70': {
    light: ['neutral', lightCadence(7)],
    dark: ['neutral', darkCadence(7)],
  },
  '80': {
    light: ['neutral', lightCadence(8)],
    dark: ['neutral', darkCadence(8)],
  },
  '400': {
    light: ['neutral', 400],
    dark: ['neutral', 400],
  },
  '450': {
    light: ['neutral', 450],
    dark: ['neutral', 450],
  },
};

// TODO(burdon): Define enum for sememe names.
export const systemSememes: ColorSememes = {
  //
  // Surfaces (bg-)
  //

  'surface-0': surface['0'],
  'surface-10': surface['10'],
  'surface-10t': applyAlpha(surface['10'], 0.65),
  'surface-20': surface['20'],
  'surface-30': surface['30'],
  'surface-40': surface['40'],
  'surface-50': surface['50'],
  'surface-60': surface['60'],
  'surface-70': surface['70'],
  'surface-80': surface['80'],
  'surface-400': surface['400'],
  'surface-450': surface['450'],
  'surface-450t': applyAlpha(surface['450'], 0.1),

  //
  // Special surfaces.
  //

  'accentSurface-300t': {
    light: ['primary', '300/.1'],
    dark: ['primary', '400/.1'],
  },
  'accentSurface-400': {
    light: ['primary', 600],
    dark: ['primary', 475],
  },
  'accentSurface-500': {
    light: ['primary', 500],
    dark: ['primary', 500],
  },

  //
  // Special surfaces (intentionally not part of contrast-order cadence).
  //

  deckSurface: {
    light: surface['60'].light,
    dark: surface['10'].dark,
  },
  inverseSurface: {
    light: ['neutral', darkCadence(2)],
    dark: ['neutral', lightCadence(2)],
  },

  //
  // Text (text-)
  // TODO(thure): Establish contrast-order cadence for text
  //

  baseText: {
    light: ['neutral', 1000],
    dark: ['neutral', 50],
  },
  inverseSurfaceText: {
    light: ['neutral', 50],
    dark: ['neutral', 1000],
  },
  description: {
    light: ['neutral', 500],
    dark: ['neutral', 400],
  },
  subdued: {
    light: ['neutral', 700],
    dark: ['neutral', 300],
  },
  accentText: {
    light: ['primary', 550],
    dark: ['primary', 400],
  },
  accentTextHover: {
    light: ['primary', 500],
    dark: ['primary', 350],
  },
  accentFocusIndicator: {
    light: ['primary', 350],
    dark: ['primary', 450],
  },
  unAccentHover: {
    light: ['neutral', 400],
    dark: ['neutral', 500],
  },
  accentSurfaceText: {
    light: ['neutral', 0],
    dark: ['neutral', 0],
  },
};

type SememeName = keyof ColorSememes;

type Alias =
  //
  // Surfaces
  //

  // Base surface for text (e.g., Document, Table, Sheet)
  | 'baseSurface'
  | 'modalSurface'
  | 'sidebarSurface'
  | 'groupSurface'
  | 'toolbarSurface'
  | 'gridHeaderSurface'
  | 'accentSurface'
  | 'accentSurfaceHover'
  | 'hoverSurface'

  //
  // TODO(burdon): Why are these here, but not deck, text, above?
  //
  | 'attention'
  | 'currentRelated'
  | 'hoverOverlay'
  | 'input'
  | 'scrim'
  | 'separator'
  | 'subduedSeparator'
  | 'unAccent'
  | 'unAccentHover';

// TODO(burdon): Import/factor out type?
type SurfaceDef = { root?: SememeName; attention?: SememeName };

export const defs: Record<Alias, SurfaceDef> = {
  baseSurface: { root: 'surface-20', attention: 'surface-0' },
  modalSurface: { root: 'surface-30' },
  sidebarSurface: { root: 'surface-30' },
  groupSurface: { root: 'surface-60___', attention: 'surface-40' },
  toolbarSurface: { root: 'surface-30' },
  gridHeaderSurface: { root: 'surface-20', attention: 'surface-30' },
  accentSurface: { root: 'accentSurface-500' },
  accentSurfaceHover: { root: 'accentSurface-400' },
  hoverSurface: { root: 'surface-70', attention: 'surface-60' },

  attention: { root: 'surface-10' },
  currentRelated: { root: 'accentSurface-300t' },
  hoverOverlay: { root: 'surface-450t' },
  input: { root: 'surface-50', attention: 'surface-40' },
  scrim: { root: 'surface-10t' },
  separator: { root: 'surface-60' },
  subduedSeparator: { root: 'surface-40' },
  unAccent: { root: 'surface-400' },
  unAccentHover: { root: 'surface-450' },
};

export const systemAliases: ColorAliases = Object.entries(defs).reduce((aliases, [alias, values]) => {
  Object.entries(values).forEach(([key, sememe]) => {
    const record = getMapValue(aliases, sememe, () => ({}));
    const list = getMapValue<string[]>(record, key, () => []);
    list.push(alias);
  });

  return aliases;
}, {} as ColorAliases);
