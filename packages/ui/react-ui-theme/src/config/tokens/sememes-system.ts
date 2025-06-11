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
  if (alpha >= 1) {
    return sememe;
  } else {
    return {
      light: [sememe.light![0], `${sememe.light![1]}/${alpha}`],
      dark: [sememe.dark![0], `${sememe.dark![1]}/${alpha}`],
    };
  }
};

const DEPTH_SCALE = 8;

const DARK_MIN = 850;
const DARK_MAX = 700;
const darkElevationCadence = (depth: number) => Math.floor(DARK_MIN + (DARK_MAX - DARK_MIN) * (depth / DEPTH_SCALE));

const LIGHT_MIN = 10;
const LIGHT_MAX = 180;
const lightElevationCadence = (depth: number) =>
  Math.floor(LIGHT_MIN + (LIGHT_MAX - LIGHT_MIN) * (depth / DEPTH_SCALE));

const elevationCadence = (lightDepth: number, darkDepth: number = lightDepth, alpha: number = 1): Sememe =>
  applyAlpha(
    {
      light: ['neutral', lightElevationCadence(lightDepth)],
      dark: ['neutral', darkElevationCadence(darkDepth)],
    },
    alpha,
  );

export const systemSememes = {
  //
  // Surfaces (bg-)
  //
  'surface-0': elevationCadence(0),
  'surface-10': elevationCadence(0.8),
  'surface-20': elevationCadence(1.6),
  'surface-30': elevationCadence(2.8, 3),
  'surface-35': elevationCadence(3.5),
  'surface-40': elevationCadence(4),
  'surface-50': elevationCadence(5),
  'surface-60': elevationCadence(6),
  'surface-70': elevationCadence(7),
  'surface-80': elevationCadence(8),

  // Screen overlay for modal dialogs.
  scrimSurface: elevationCadence(0.8, 0.8, 0.65),

  'surface-400': {
    light: ['neutral', 400],
    dark: ['neutral', 400],
  },
  'surface-450': {
    light: ['neutral', 450],
    dark: ['neutral', 450],
  },
  hoverOverlay: {
    light: ['neutral', '450/.1'],
    dark: ['neutral', '450/.1'],
  },

  //
  // Special surfaces.
  //

  accentSurfaceRelated: {
    light: ['primary', '300/.1'],
    dark: ['primary', '400/.1'],
  },
  accentSurfaceHover: {
    light: ['primary', 600],
    dark: ['primary', 475],
  },
  accentSurface: {
    light: ['primary', 500],
    dark: ['primary', 500],
  },

  deckSurface: elevationCadence(6, 0.8),
  inverseSurface: elevationCadence(2),

  //
  // Text (text-)
  // TODO(thure): Establish contrast-order cadence for text.
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
  neutralFocusIndicator: {
    light: ['neutral', 350],
    dark: ['neutral', 450],
  },
  unAccentHover: {
    light: ['neutral', 400],
    dark: ['neutral', 500],
  },
  accentSurfaceText: {
    light: ['neutral', 0],
    dark: ['neutral', 0],
  },
} satisfies ColorSememes;

type SememeName = keyof typeof systemSememes;

/**
 * Alias map.
 */
const aliasDefs: Record<string, Record<string, SememeName>> = {
  // Base surface for text (e.g., Document, Table, Sheet.)
  baseSurface: { root: 'surface-20' },

  // Selected items, current items, other surfaces needing special contrast against baseSurface.
  activeSurface: { root: 'surface-50' },

  // Main sidebar panel.
  sidebarSurface: { root: 'surface-30' },

  // Dialogs, menus, popovers, etc.
  modalSurface: { root: 'surface-50' },

  // Plank header.
  headerSurface: { root: 'surface-30' },

  // Forms, cards, etc.
  cardSurface: { root: 'surface-30' },

  // Toolbars, table/sheet headers, etc.
  toolbarSurface: { root: 'surface-30' },

  // Opaque hover
  hoverSurface: { root: 'surface-70' },

  attention: { root: 'surface-10' },

  currentRelated: { root: 'accentSurfaceRelated' },

  input: { root: 'surface-35' },

  separator: { root: 'surface-50' },

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
