//
// Copyright 2024 DXOS.org
//

import { huePalettes } from './physical-colors';
import { type ColorAliases, type ColorSememes } from './types';

export const peerSememes: ColorSememes = Object.keys(huePalettes).reduce((acc: ColorSememes, palette) => {
  acc[`${palette}Cursor`] = {
    light: [palette, 400],
    dark: [palette, 300],
  };
  acc[`${palette}Text`] = {
    light: [palette, 550],
    dark: [palette, 300],
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

const valenceAliasSememeStems = ['Text', 'Surface', 'SurfaceText'];
const valenceMapping = { success: 'emerald', info: 'cyan', warning: 'amber', error: 'rose' };

export const valenceAliases: ColorAliases = valenceAliasSememeStems.reduce((acc: ColorAliases, stem) => {
  return Object.entries(valenceMapping).reduce((acc: ColorAliases, [valence, hue]) => {
    acc[`${valence}${stem}`] = { root: [`${hue}${stem}`] };
    return acc;
  }, acc);
}, {});
