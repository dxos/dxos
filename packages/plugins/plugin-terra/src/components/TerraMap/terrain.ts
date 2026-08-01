//
// Copyright 2026 DXOS.org
//

import { type TerraConfigValues, classify, colorFor, makeSampler } from '../../engine';
import { toUnit } from '../../sim';
import { MAP_HEIGHT, MAP_WIDTH } from './projection';

/**
 * One sample per degree. Enough to read coastlines at map scale (the nav grid the router works from
 * is far coarser at 24 cells per cube-face edge), and ~65k samples costs well under a tenth of the
 * planet mesh — but it is still the most expensive thing this view does, so callers memoize it on
 * the config.
 */
const SAMPLES_PER_DEGREE = 1;

/**
 * The seed's land and sea as a PNG data URL, sampling the same elevation/moisture fields and biome
 * palette as the 3D planet so the two views agree. Returns `undefined` where a 2D canvas context is
 * unavailable (a non-browser test environment), letting the map fall back to a plain grid.
 */
export const renderTerrain = (config: TerraConfigValues): string | undefined => {
  const width = MAP_WIDTH * SAMPLES_PER_DEGREE;
  const height = MAP_HEIGHT * SAMPLES_PER_DEGREE;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }

  const { elevation, moisture } = makeSampler(config);
  const image = context.createImageData(width, height);
  for (let row = 0; row < height; row++) {
    const lat = 90 - ((row + 0.5) / height) * MAP_HEIGHT;
    for (let column = 0; column < width; column++) {
      const lng = ((column + 0.5) / width) * MAP_WIDTH - 180;
      const unit = toUnit({ lat, lng });
      const elevationAt = elevation(unit);
      const biome = classify(config, elevationAt, Math.abs(unit[1]), moisture(unit));
      const [red, green, blue] = colorFor(biome, elevationAt, config.waterLevel);
      const offset = (row * width + column) * 4;
      image.data[offset] = Math.round(red * 255);
      image.data[offset + 1] = Math.round(green * 255);
      image.data[offset + 2] = Math.round(blue * 255);
      image.data[offset + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
};
