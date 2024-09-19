//
// Copyright 2024 DXOS.org
//

import { type huePalettes } from './physical-colors';
import { type ColorSememes } from './types';

const valenceValues = {
  Text: [550, 300],
  MessageText: [600, 100],
  MessageSurface: [50, 900],
  StatusSurface: [500, 400],
  StatusText: [400, 500],
  StatusStroke: [300, 500],
  Shadow: ['500/.5', '500/.5'],
};

const valenceHues = {
  success: 'emerald',
  info: 'cyan',
  active: 'primary',
  warning: 'amber',
  error: 'rose',
} satisfies Record<string, keyof typeof huePalettes | 'primary'>;

const exceptions = {
  inactiveStatusSurface: { light: ['neutral', 100], dark: ['neutral', 600] },
  inactiveStatusText: { light: ['neutral', 100], dark: ['neutral', 600] },
  inactiveStatusStroke: { light: ['neutral', 100], dark: ['neutral', 700] },
} satisfies ColorSememes;

export const valenceSememes: ColorSememes = Object.entries(valenceHues).reduce((acc: ColorSememes, [valence, hue]) => {
  return Object.entries(valenceValues).reduce((acc: ColorSememes, [aspect, [lightValue, darkValue]]) => {
    acc[`${valence}${aspect}`] = {
      light: [hue, lightValue],
      dark: [hue, darkValue],
    };
    return acc;
  }, acc);
}, exceptions);
