//
// Copyright 2024 DXOS.org
//

import { huePalettes } from './hue-palettes';
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
  acc[`${palette}TextHover`] = {
    light: [palette, 450],
    dark: [palette, 200],
  };
  acc[`${palette}Fill`] = {
    light: [palette, 500],
    dark: [palette, 500],
  };
  return acc;
}, {});
