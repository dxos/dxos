//
// Copyright 2026 DXOS.org
//

// Worker-only: `build:functions` emits each `.wasm` beside `_worker.js`, where wrangler compiles it into
// a module, and inlines each font as bytes.

import inter400 from '@fontsource/inter/files/inter-latin-400-normal.woff';
import inter600 from '@fontsource/inter/files/inter-latin-600-normal.woff';
import inter400Ext from '@fontsource/inter/files/inter-latin-ext-400-normal.woff';
import inter600Ext from '@fontsource/inter/files/inter-latin-ext-600-normal.woff';
import resvg from '@resvg/resvg-wasm/index_bg.wasm';
import layout from 'satori/yoga.wasm';

import { type RenderAssets } from './render.ts';

export const assets: RenderAssets = {
  layout,
  resvg,
  fonts: [
    { name: 'Inter', data: inter400, weight: 400, style: 'normal' },
    { name: 'Inter', data: inter400Ext, weight: 400, style: 'normal' },
    { name: 'Inter', data: inter600, weight: 600, style: 'normal' },
    { name: 'Inter', data: inter600Ext, weight: 600, style: 'normal' },
  ],
};
