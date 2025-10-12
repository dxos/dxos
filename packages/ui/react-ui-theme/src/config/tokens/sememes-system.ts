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

// Luminosity extrema and key points.

// Both elevation cadences go from darker to lighter from “elevation” 0 to `ELEVATION_SCALE`,
// whereas both contrast cadences go from highest contrast at 0 to lowest contrast at `CONTRAST_SCALE`.

const DARK_ELEVATION_MIN = 855;
const DARK_ELEVATION_MAX = 731;

const DARK_CONTRAST_MIN = 750;
const DARK_CONTRAST_MAX = 665;

const LIGHT_ELEVATION_MIN = 0;
const LIGHT_ELEVATION_MAX = 0;

const LIGHT_CONTRAST_MIN = 82;
const LIGHT_CONTRAST_MAX = 24;

const ELEVATION_SCALE = 2;
const CONTRAST_SCALE = 3;

const darkElevationCadence = (depth: number) =>
  Math.round(
    DARK_ELEVATION_MAX + (DARK_ELEVATION_MIN - DARK_ELEVATION_MAX) * ((ELEVATION_SCALE - depth) / ELEVATION_SCALE),
  );
const darkContrastCadence = (depth: number) =>
  Math.round(
    DARK_CONTRAST_MAX + (DARK_CONTRAST_MIN - DARK_CONTRAST_MAX) * ((ELEVATION_SCALE - depth) / ELEVATION_SCALE),
  );

const lightElevationCadence = (depth: number) =>
  Math.round(
    LIGHT_ELEVATION_MIN + (LIGHT_ELEVATION_MAX - LIGHT_ELEVATION_MIN) * ((CONTRAST_SCALE - depth) / CONTRAST_SCALE),
  );
const lightContrastCadence = (depth: number) =>
  Math.round(LIGHT_CONTRAST_MAX + (LIGHT_CONTRAST_MIN - LIGHT_CONTRAST_MAX) * (depth / CONTRAST_SCALE));

const elevationCadence = (lightDepth: number, darkDepth: number = lightDepth, alpha: number = 1): Sememe =>
  applyAlpha(
    {
      light: ['neutral', lightElevationCadence(lightDepth)],
      dark: ['neutral', darkElevationCadence(darkDepth)],
    },
    alpha,
  );

const contrastCadence = (lightDepth: number, darkDepth: number = lightDepth, alpha: number = 1): Sememe =>
  applyAlpha(
    {
      light: ['neutral', lightContrastCadence(lightDepth)],
      dark: ['neutral', darkContrastCadence(darkDepth)],
    },
    alpha,
  );

export const systemSememes = {
  //
  // Elevation cadence tokens
  //

  baseSurface: elevationCadence(0),
  groupSurface: elevationCadence(1),
  modalSurface: elevationCadence(2, 1.7),

  //
  // Contrast cadence tokens
  //

  textInputSurfaceBase: contrastCadence(0, 0),
  textInputSurfaceGroup: contrastCadence(0, 0.5),
  textInputSurfaceModal: contrastCadence(0, 1),

  inputSurfaceBase: contrastCadence(0.8, 0.33),
  inputSurfaceGroup: contrastCadence(0.8, 0.66),
  inputSurfaceModal: contrastCadence(0.8, 1),

  hoverSurfaceBase: contrastCadence(2, 1.5),
  hoverSurfaceGroup: contrastCadence(2, 2),
  hoverSurfaceModal: contrastCadence(2, 2.5),

  separatorBase: contrastCadence(3, 2),
  separatorGroup: contrastCadence(3, 2.5),
  separatorModal: contrastCadence(3, 3),

  subduedSeparator: contrastCadence(3, 1),

  unAccent: {
    light: ['neutral', 400],
    dark: ['neutral', 400],
  },
  unAccentHover: {
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

  // Screen overlay for modal dialogs.
  scrimSurface: applyAlpha(
    {
      light: ['neutral', LIGHT_CONTRAST_MAX],
      dark: ['neutral', DARK_ELEVATION_MIN],
    },
    0.65,
  ),

  // High contrast for focused interactive elements. (Technically this is part of the surface cadence, but the contrast cadence is on the opposite side of the elevation cadence as this point.)
  focusSurface: {
    light: ['neutral', 0],
    dark: ['neutral', 1000],
  },

  // For tooltips only; the highest elevation from the opposite theme
  inverseSurface: {
    light: ['neutral', DARK_ELEVATION_MIN],
    dark: ['neutral', LIGHT_ELEVATION_MIN],
  },

  //
  // Accent surfaces
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

  //
  // Text (text-) and other foregrounds
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
    light: ['neutral', 550],
    dark: ['neutral', 350],
  },
  subdued: {
    light: ['neutral', 700],
    dark: ['neutral', 300],
  },
  placeholder: {
    light: ['neutral', 500],
    dark: ['neutral', 500],
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
    light: ['neutral', 300],
    dark: ['neutral', 450],
  },
  accentFocusIndicator: {
    light: ['primary', 300],
    dark: ['primary', 450],
  },
  accentSurfaceText: {
    light: ['neutral', 0],
    dark: ['neutral', 0],
  },
} satisfies ColorSememes;

type SememeName = keyof typeof systemSememes;
type SememeKey = 'root' | 'group' | 'modal';

/**
 * Alias map.
 */
const aliasDefs: Record<string, Partial<Record<SememeKey, SememeName>>> = {
  // The background color appearing in overscroll and between planks when Deck is enabled.
  // TODO(burdon): Make distinct from groupSurface.
  deckSurface: {
    root: 'groupSurface',
  },

  // Selected items, current items, other surfaces needing special contrast against baseSurface.
  activeSurface: {
    root: 'inputSurfaceBase',
  },

  // Main sidebar panel.
  sidebarSurface: {
    root: 'groupSurface',
  },

  // Plank header.
  headerSurface: {
    root: 'groupSurface',
  },

  // Toolbars, table/sheet headers, etc.
  toolbarSurface: {
    root: 'groupSurface',
  },

  // Forms, cards, etc.
  cardSurface: {
    root: 'groupSurface',
  },

  // Secondary aliases.
  textInputSurface: {
    root: 'textInputSurfaceBase',
    group: 'textInputSurfaceGroup',
    modal: 'textInputSurfaceModal',
  },
  inputSurface: {
    root: 'inputSurfaceBase',
    group: 'inputSurfaceGroup',
    modal: 'inputSurfaceModal',
  },
  hoverSurface: {
    root: 'hoverSurfaceBase',
    group: 'hoverSurfaceGroup',
    modal: 'hoverSurfaceModal',
  },

  // TODO(thure): Rename uses of this token to `focusSurface` and remove this alias.
  attention: {
    root: 'focusSurface',
  },

  // In “master-detail” patterns, the background of the item in the list which is enumerated in the adjacent view.
  // TODO(burdon): Review tokens.
  currentRelated: {
    root: 'modalSurface',
  },

  // Borders and dividers.
  separator: {
    root: 'separatorBase',
    group: 'separatorGroup',
    modal: 'separatorModal',
  },
};

export const systemAliases: ColorAliases = Object.entries(aliasDefs).reduce((aliases, [alias, values]) => {
  Object.entries(values).forEach(([key, sememe]) => {
    const record = getMapValue(aliases, sememe, () => ({}));
    const list = getMapValue<string[]>(record, key, () => []);
    list.push(alias);
  });

  return aliases;
}, {} as ColorAliases);
