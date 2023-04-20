//
// Copyright 2023 DXOS.org
//

import {
  curvePathFromPalette,
  paletteShadesFromCurve,
  Lab_to_hex as labToHex,
  hex_to_LCH as hexToLch
} from '@fluent-blocks/colors';
import plugin from 'tailwindcss/plugin';

export type PaletteConfig = {
  keyColor: string;
  darkCp: number;
  lightCp: number;
  hueTorsion: number;
};

const defaultShadeNumbers: number[] = [...Array(19)].map((_, i) => 50 + i * 50);
const shadeValues = defaultShadeNumbers.reduce((acc: Record<string, string>, n) => {
  acc[n] = `${n}`;
  return acc;
}, {});

export const colorPlugin = plugin(({ matchUtilities, theme }) => {
  const palettes = Object.keys(theme('palettes') ?? {});
  palettes.forEach((palette) => {
    const paletteConfig = theme(`palettes.${palette}`) as PaletteConfig;
    const curve = curvePathFromPalette({
      ...paletteConfig,
      keyColor: hexToLch(paletteConfig.keyColor)
    });
    const defaultShades = paletteShadesFromCurve(curve, 21, [0, 100], 1, 24).reverse();
    const valueToHex = (value: string) => {
      const shadeNumber = parseInt(value);
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
    matchUtilities(
      {
        // todo(thure): Register utility for all that apply colors
        // todo(thure): How to handle opacity?
        // https://github.com/tailwindlabs/tailwindcss/blob/ac1738e74807136a0aa05c3a39197f6ec80b689a/src/util/getAllConfigs.js#L23-L28
        [`text-${palette}`]: (value) => {
          return { color: valueToHex(value) };
        }
      },
      { values: shadeValues }
    );
  });
});
