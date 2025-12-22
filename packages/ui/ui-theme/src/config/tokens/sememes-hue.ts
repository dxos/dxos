//
// Copyright 2024 DXOS.org
//

import { huePalettes } from './physical-colors';
import { type ColorAliases, type ColorSememes } from './types';

export const hueSememes: ColorSememes = [...Object.keys(huePalettes), 'neutral', 'primary'].reduce(
  (acc: ColorSememes, palette) => {
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
    acc[`${palette}Screen`] = {
      light: [palette, 100],
      dark: [palette, 800],
    };
    return acc;
  },
  {},
);

const valenceAliasSememeStems = ['Text', 'Surface', 'SurfaceText', 'Fill', 'Cursor'];
const valenceMapping = {
  emerald: ['success'],
  cyan: ['info'],
  amber: ['warning'],
  rose: ['error'],
  primary: ['current'],
  fuchsia: ['internal'],
};

export const valenceAliases: ColorAliases = valenceAliasSememeStems.reduce((acc: ColorAliases, stem) => {
  return Object.entries(valenceMapping).reduce((acc: ColorAliases, [hue, valences]) => {
    acc[`${hue}${stem}`] = { root: valences.map((valence) => `${valence}${stem}`) };
    return acc;
  }, acc);
}, {});
