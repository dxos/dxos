//
// Copyright 2026 DXOS.org
//

import { hues } from '@dxos/ui-types';

const TONES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/** Text over a highlight is black up to tone 500 and white beyond, in either theme. */
const DARK_TEXT = 'black';
const LIGHT_TEXT = 'white';

let tones: Map<string, number> | undefined;

/**
 * The theme tone of a highlight color: a swatch stores its tone's resolved value, so the palette's own values (read once)
 * name it back.
 */
const toneOf = (color: string): number | undefined => {
  if (!tones) {
    tones = new Map();
    if (typeof document !== 'undefined') {
      const style = getComputedStyle(document.documentElement);
      for (const hue of ['neutral', ...hues]) {
        for (const tone of TONES) {
          const value = style.getPropertyValue(`--color-${hue}-${tone}`).trim();
          if (value) {
            tones.set(value, tone);
          }
        }
      }
    }
  }
  return tones.get(color);
};

// The lightness of an `oklch()` color, as a fraction.
const OKLCH = /^oklch\(\s*([\d.]+)(%?)/i;

/** A highlight's lightness, when the color is not one of the theme's tones (e.g. stored from another palette). */
const lightnessOf = (color: string): number | undefined => {
  const match = OKLCH.exec(color);
  return match ? Number(match[1]) / (match[2] ? 100 : 1) : undefined;
};

/** The text color for a highlighted cell: by its theme tone, else by contrast; other colors keep the grid's own. */
export const highlightForeground = (background: string | undefined): string | undefined => {
  if (!background) {
    return undefined;
  }
  const tone = toneOf(background);
  if (tone !== undefined) {
    return tone > 500 ? LIGHT_TEXT : DARK_TEXT;
  }
  const lightness = lightnessOf(background);
  if (lightness === undefined) {
    return undefined;
  }
  // Relative luminance from OKLCH lightness (exact for a neutral color, close for others), then whichever text color
  // has the higher WCAG contrast against it.
  const luminance = lightness ** 3;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? DARK_TEXT : LIGHT_TEXT;
};
