//
// Copyright 2024 DXOS.org
//

import { huePalettes } from './physical-colors';
import { type ColorSememes } from './types';

export const peerSememes: ColorSememes = Object.keys(huePalettes).reduce((acc: ColorSememes, palette) => {
  acc[`${palette}Cursor`] = {
    light: [palette, 400],
    dark: [palette, 300],
  };
  acc[`${palette}Text`] = {
    light: [palette, 550],
    dark: [palette, 300],
  };
  acc[`${palette}Shadow`] = {
    light: [palette, '500/.5'],
    dark: [palette, '500/.5'],
  };
  acc[`${palette}Fill`] = {
    light: [palette, 500],
    dark: [palette, 500],
  };
  acc[`${palette}Surface`] = {
    light: [palette, 200],
    dark: [palette, 700],
  };
  acc[`${palette}SurfaceText`] = {
    light: [palette, 700],
    dark: [palette, 200],
  };
  return acc;
}, {});
