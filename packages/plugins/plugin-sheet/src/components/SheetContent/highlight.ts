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

/** The text color for a cell highlighted with a theme swatch; other colors keep the grid's own text color. */
export const highlightForeground = (background: string | undefined): string | undefined => {
  const tone = background ? toneOf(background) : undefined;
  return tone === undefined ? undefined : tone > 500 ? LIGHT_TEXT : DARK_TEXT;
};
