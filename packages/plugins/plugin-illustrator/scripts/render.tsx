//
// Copyright 2026 DXOS.org
//

//
// PNG renderings of standalone SVGs (`toSvgFile`), for judges that read images and for the files beside a render.
//

import type * as DecisionModel from 'effect/ai/DecisionModel';
import sharp from 'sharp';

/** Twice the SVG's CSS-pixel size, as a 2x screenshot would be; librsvg treats 72 DPI as 1:1. */
const DENSITY = 144;

/**
 * Rasterizes one SVG with librsvg (via sharp), which `toSvgFile` targets with fallbacks for the
 * custom properties and `color-mix` it cannot resolve, so no headless browser has to start.
 */
export const toPng = (svg: string): sharp.Sharp => sharp(Buffer.from(svg), { density: DENSITY }).png();

/** Rasterizes SVGs to PNG images. */
export const toPngs = (svgs: readonly string[]): Promise<DecisionModel.Image[]> =>
  Promise.all(
    svgs.map(async (svg) => ({ mediaType: 'image/png', data: (await toPng(svg).toBuffer()).toString('base64') })),
  );
