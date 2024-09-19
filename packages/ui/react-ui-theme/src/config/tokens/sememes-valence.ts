//
// Copyright 2024 DXOS.org
//

import { type huePalettes } from './physical-colors';
import { type ColorSememes } from './types';

const valenceLuminosities = {
  Text: [550, 300],
  MessageText: [600, 100],
  MessageSurface: [50, 900],
  Shadow: ['500/.5', '500/.5'],
};

const valenceHues = {
  success: 'emerald',
  info: 'cyan',
  warning: 'amber',
  error: 'rose',
} satisfies Record<string, keyof typeof huePalettes>;

export const valenceSememes: ColorSememes = Object.entries(valenceHues).reduce((acc: ColorSememes, [valence, hue]) => {
  return Object.entries(valenceLuminosities).reduce((acc: ColorSememes, [aspect, [lightValue, darkValue]]) => {
    acc[`${valence}${aspect}`] = {
      light: [hue, lightValue],
      dark: [hue, darkValue],
    };
    return acc;
  }, acc);
}, {});
