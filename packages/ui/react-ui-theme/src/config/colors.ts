//
// Copyright 2024 DXOS.org
//

import {
  curvePathFromPalette,
  paletteShadesFromCurve,
  hex_to_LCH as hexToLch,
  Lab_to_hex as labToHex,
} from '@ch-ui/colors';

export type PaletteConfig = {
  keyColor: string;
  darkCp: number;
  lightCp: number;
  hueTorsion: number;
};

const shadeNumbers: number[] = /* [...Array(19)].map((_, i) => 50 + i * 50); */ [
  50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900, 950,
];

const broadShadeNumbers: number[] = [
  12, 25, 37, 50, 75, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650, 700, 750, 800, 825, 850, 875,
  900, 925, 950, 975,
];

const dtor = Math.PI / 180;

export type HuePalette =
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose';

export type ConfigPalette = HuePalette | 'primary' | 'neutral';

export const paletteConfigs: Record<ConfigPalette, PaletteConfig> = {
  red: {
    keyColor: '#ee003b',
    darkCp: 1,
    lightCp: 0.13,
    hueTorsion: 5.5 * dtor,
  },
  orange: {
    keyColor: '#fa6b32',
    darkCp: 0.725,
    lightCp: 1,
    hueTorsion: 13 * dtor,
  },
  amber: {
    keyColor: '#f08c00',
    darkCp: 1,
    lightCp: 1,
    hueTorsion: 24 * dtor,
  },
  yellow: {
    keyColor: '#ffd900',
    darkCp: 1,
    lightCp: 1,
    hueTorsion: 32 * dtor,
  },
  lime: {
    keyColor: '#99c400',
    darkCp: 1,
    lightCp: 1,
    hueTorsion: -3.5 * dtor,
  },
  green: {
    keyColor: '#30a908',
    darkCp: 0.35,
    lightCp: 0.665,
    hueTorsion: -10.5 * dtor,
  },
  emerald: {
    keyColor: '#15e066',
    darkCp: 1,
    lightCp: 0.735,
    hueTorsion: -7 * dtor,
  },
  teal: {
    keyColor: '#00a270',
    darkCp: 1,
    lightCp: 0.755,
    hueTorsion: -12 * dtor,
  },
  cyan: {
    keyColor: '#048992',
    darkCp: 1,
    lightCp: 0.855,
    hueTorsion: -15 * dtor,
  },
  sky: {
    keyColor: '#007bc2',
    darkCp: 1,
    lightCp: 0.64,
    hueTorsion: 0,
  },
  blue: {
    keyColor: '#0058cb',
    darkCp: 1,
    lightCp: 0.495,
    hueTorsion: -7 * dtor,
  },
  indigo: {
    keyColor: '#1b45c5',
    darkCp: 0.495,
    lightCp: 0.55,
    hueTorsion: 0,
  },
  violet: {
    keyColor: '#080886',
    darkCp: 0.195,
    lightCp: 0.635,
    hueTorsion: -5 * dtor,
  },
  purple: {
    keyColor: '#2c0073',
    darkCp: 0,
    lightCp: 0.63,
    hueTorsion: 0,
  },
  fuchsia: {
    keyColor: '#6d0085',
    darkCp: 1,
    lightCp: 0.695,
    hueTorsion: 0,
  },
  pink: {
    keyColor: '#a5006d',
    darkCp: 1,
    lightCp: 0.775,
    hueTorsion: 0,
  },
  rose: {
    keyColor: '#d00054',
    darkCp: 1,
    lightCp: 1,
    hueTorsion: 0,
  },
  neutral: {
    keyColor: '#707076',
    darkCp: 0.8,
    lightCp: 0.88,
    hueTorsion: 0,
  },
  primary: {
    keyColor: '#1662d9',
    darkCp: 0.86,
    lightCp: 1,
    hueTorsion: -30 * dtor,
  },
};

export const physicalColors = Object.keys(paletteConfigs).reduce(
  (acc: Record<string, Record<string, string>>, palette) => {
    const isBroad = palette === 'neutral' || palette === 'primary';
    const paletteConfig = paletteConfigs[palette as ConfigPalette];
    const curve = curvePathFromPalette({
      ...paletteConfig,
      keyColor: hexToLch(paletteConfig.keyColor),
    });
    const defaultShades = paletteShadesFromCurve(curve, 21, [0, 100 * (22 / 21)], 1, 24).reverse();
    const renderCssValue = (shadeNumber: number) => {
      if (shadeNumber > 999) {
        return '#000000';
      } else if (shadeNumber < 1) {
        return '#ffffff';
      } else if (shadeNumber % 50 === 0) {
        return labToHex(defaultShades[shadeNumber / 50]);
      } else {
        const k2 = (shadeNumber % 50) / 50;
        const k1 = 1 - k2;
        const [l1, a1, b1] = defaultShades[Math.floor(shadeNumber / 50)];
        const [l2, a2, b2] = defaultShades[Math.ceil(shadeNumber / 50)];
        return labToHex([l1 * k1 + l2 * k2, a1 * k1 + a2 * k2, b1 * k1 + b2 * k2]);
      }
    };
    acc[palette] = (isBroad ? broadShadeNumbers : shadeNumbers).reduce((acc: Record<string, string>, shadeNumber) => {
      acc[shadeNumber] = renderCssValue(shadeNumber);
      return acc;
    }, {});

    return acc;
  },
  {},
);

export const semanticColors = {
  scrim: {
    light: `${physicalColors.neutral['75']}A6`,
    dark: `${physicalColors.neutral['900']}A6`,
  },
  attention: {
    light: '#ffffff',
    dark: physicalColors.neutral['900'],
  },
  base: {
    light: physicalColors.neutral['25'],
    dark: physicalColors.neutral['850'],
    fg: { light: '#000000', dark: '#ffffff' },
  },
  fgHover: {
    light: physicalColors.neutral['900'],
    dark: physicalColors.neutral['100'],
  },
  description: {
    light: physicalColors.neutral['300'],
    dark: physicalColors.neutral['500'],
  },
  baseGlass: {
    light: `${physicalColors.neutral['12']}e0`,
    dark: `${physicalColors.neutral['850']}e0`,
  },
  input: {
    light: physicalColors.neutral['50'],
    dark: physicalColors.neutral['825'],
  },
  modal: {
    light: '#ffffff',
    dark: `${physicalColors.neutral['750']}`,
  },
  modalSelected: {
    light: physicalColors.neutral['50'],
    dark: physicalColors.neutral['825'],
  },
  hover: {
    light: physicalColors.neutral['37'],
    dark: physicalColors.neutral['800'],
  },
  accent: {
    light: physicalColors.primary['550'],
    dark: physicalColors.primary['550'],
    fg: { light: physicalColors.primary['550'], dark: physicalColors.primary['400'] },
  },
  accentHover: {
    light: physicalColors.primary['600'],
    dark: physicalColors.primary['500'],
  },
  unAccent: {
    light: physicalColors.neutral['500'],
    dark: physicalColors.neutral['400'],
  },
  unAccentHover: {
    light: physicalColors.neutral['400'],
    dark: physicalColors.neutral['500'],
  },
  separator: {
    light: physicalColors.neutral['75'],
    dark: physicalColors.neutral['750'],
  },
  inverse: {
    light: '#ffffff',
    dark: '#ffffff',
  },
  unavailable: {
    light: physicalColors.neutral['100'],
    dark: physicalColors.neutral['600'],
  },
};
