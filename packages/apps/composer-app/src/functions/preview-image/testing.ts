//
// Copyright 2026 DXOS.org
//

import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';

import { type RenderAssets } from './render.ts';

const require = createRequire(import.meta.url);
const read = (specifier: string) => readFile(require.resolve(specifier));

/** The renderer's assets read from `node_modules`, for tests, which cannot import `.wasm` as the Worker does. */
export const loadRenderAssets = async (): Promise<RenderAssets> => {
  const [layout, resvg, regular, semibold] = await Promise.all([
    read('satori/yoga.wasm'),
    read('@resvg/resvg-wasm/index_bg.wasm'),
    read('@fontsource/inter/files/inter-latin-400-normal.woff'),
    read('@fontsource/inter/files/inter-latin-600-normal.woff'),
  ]);
  return {
    layout,
    resvg,
    fonts: [
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: semibold, weight: 600, style: 'normal' },
    ],
  };
};

/** Width and height from a PNG's IHDR chunk. */
export const pngSize = (png: Uint8Array) => {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

export const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
