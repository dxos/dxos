//
// Copyright 2024 DXOS.org
//

// TODO(thure): TS2742
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

const STEPS = 8;

const DARK_MIN = 850;
const DARK_MAX = 700;
const darkCadence = (step: number) => Math.floor(DARK_MIN + (DARK_MAX - DARK_MIN) * (step / STEPS));

const LIGHT_MIN = 10;
const LIGHT_MAX = 180;
const lightCadence = (step: number) => Math.floor(LIGHT_MIN + (LIGHT_MAX - LIGHT_MIN) * (step / STEPS));

/**
 * Surface cadence sememes (in contrast-order)
 */
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
  '35': {
    light: ['neutral', lightCadence(3.5)],
    dark: ['neutral', darkCadence(3.5)],
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

  // TODO(burdon): Why are these the same for light/dark?
  '400': {
    light: ['neutral', 400],
    dark: ['neutral', 400],
  },
  '450': {
    light: ['neutral', 450],
    dark: ['neutral', 450],
  },
};

export const systemSememes = {
  //
  // Surfaces (bg-)
  //

  'surface-0': surface['0'],
  'surface-10': surface['10'],
  'surface-10t': applyAlpha(surface['10'], 0.65),
  'surface-20': surface['20'],
  'surface-30': surface['30'],
  'surface-35': surface['35'],
  'surface-40': surface['40'],
  'surface-50': surface['50'],
  'surface-60': surface['60'],
  'surface-70': surface['70'],
  'surface-80': surface['80'],

  // TODO(burdon): Confusing mix of -NN with light and dark valence (above), and -400/450 that have the same value.
  //   I assume 10,20,30, etc. are on a nominal 0-100 "intensity" range and 400/450 are in the 0-1000 light-to-darkrange?
  'surface-400': surface['400'],
  'surface-450': surface['450'],
  'surface-450t': applyAlpha(surface['450'], 0.1),

  //
  // Special surfaces.
  //

  ['accentSurfaceRelated' as const]: {
    light: ['primary', '300/.1'],
    dark: ['primary', '400/.1'],
  },
  ['accentSurfaceHover' as const]: {
    light: ['primary', 600],
    dark: ['primary', 475],
  },
  ['accentSurface' as const]: {
    light: ['primary', 500],
    dark: ['primary', 500],
  },

  //
  // Special surfaces (intentionally not part of contrast-order cadence).
  //

  ['deckSurface' as const]: {
    light: surface['60'].light,
    dark: surface['10'].dark,
  },
  ['inverseSurface' as const]: {
    light: ['neutral', darkCadence(2)],
    dark: ['neutral', lightCadence(2)],
  },

  //
  // Text (text-)
  // TODO(thure): Establish contrast-order cadence for text.
  //

  ['baseText' as const]: {
    light: ['neutral', 1000],
    dark: ['neutral', 50],
  },
  ['inverseSurfaceText' as const]: {
    light: ['neutral', 50],
    dark: ['neutral', 1000],
  },
  ['description' as const]: {
    light: ['neutral', 500],
    dark: ['neutral', 400],
  },
  ['subdued' as const]: {
    light: ['neutral', 700],
    dark: ['neutral', 300],
  },
  ['accentText' as const]: {
    light: ['primary', 550],
    dark: ['primary', 400],
  },
  ['accentTextHover' as const]: {
    light: ['primary', 500],
    dark: ['primary', 350],
  },
  ['accentFocusIndicator' as const]: {
    light: ['neutral', 350],
    dark: ['neutral', 450],
  },
  ['unAccentHover' as const]: {
    light: ['neutral', 400],
    dark: ['neutral', 500],
  },
  ['accentSurfaceText' as const]: {
    light: ['neutral', 0],
    dark: ['neutral', 0],
  },
} satisfies ColorSememes;

type SememeName = keyof typeof systemSememes;

/**
 * Alias map.
 */
const aliasDefs: Record<string, { root?: SememeName; attention?: SememeName }> = {
  // Base surface for text (e.g., Document, Table, Sheet.)
  baseSurface: { root: 'surface-20', attention: 'surface-0' },

  // Currented / selected items, other surfaces needing special contrast against baseSurface. TODO(thure): Rename.
  groupSurface: { root: 'surface-50', attention: 'surface-40' },

  // Main sidebar panel.
  sidebarSurface: { root: 'surface-30' },

  // Dialogs, menus, popovers, etc.
  modalSurface: { root: 'surface-50' },

  // Plank header.
  headerSurface: { root: 'surface-30', attention: 'surface-20' },

  // Forms, cards, etc.
  cardSurface: { root: 'surface-30', attention: 'surface-20' },

  // Toolbars, table/sheet headers, etc.
  toolbarSurface: { root: 'surface-30', attention: 'surface-20' },

  // Mouse-over hover.
  hoverSurface: { root: 'surface-70', attention: 'surface-60' },

  // Screen overlay for modal dialogs.
  scrimSurface: { root: 'surface-10t' },

  //
  // TODO(burdon): Why are these here, but not deck, text, above? Are these all surfaces?
  //

  attention: { root: 'surface-10' },

  currentRelated: { root: 'accentSurfaceRelated' },

  // TODO(burdon): Different from hoverSurface?
  hoverOverlay: { root: 'surface-450t' },

  input: { root: 'surface-35', attention: 'surface-35' },

  separator: { root: 'surface-50' },
  subduedSeparator: { root: 'surface-30' },

  unAccent: { root: 'surface-400' },
  unAccentHover: { root: 'surface-450' },
};

export const systemAliases: ColorAliases = Object.entries(aliasDefs).reduce((aliases, [alias, values]) => {
  Object.entries(values).forEach(([key, sememe]) => {
    const record = getMapValue(aliases, sememe, () => ({}));
    const list = getMapValue<string[]>(record, key, () => []);
    list.push(alias);
  });

  return aliases;
}, {} as ColorAliases);
