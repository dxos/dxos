//
// Copyright 2026 DXOS.org
//

import { Resvg, initWasm } from '@resvg/resvg-wasm';
import satori, { type Font, init as initSatori } from 'satori/standalone';

import { type Card, HEIGHT, type Icons, WIDTH, iconKey, iconsOf, layout } from './card.ts';

/**
 * What rendering needs from its host. A Worker cannot compile WebAssembly at run time, so it passes
 * modules its bundler compiled; Node passes the bytes.
 */
export type RenderAssets = {
  layout: WebAssembly.Module | BufferSource;
  resvg: WebAssembly.Module | BufferSource;
  fonts: Font[];
};

export type RenderOptions = {
  assets: RenderAssets;
  loadIcon: (id: string) => Promise<string | undefined>;
};

/** Both engines keep their instance at module scope, and each may be initialised only once. */
let ready: Promise<void> | undefined;

export const renderCard = async (card: Card, { assets, loadIcon }: RenderOptions): Promise<Uint8Array<ArrayBuffer>> => {
  ready ??= Promise.all([initSatori(assets.layout), initWasm(assets.resvg)]).then(
    () => undefined,
    (error) => {
      ready = undefined;
      throw error;
    },
  );
  const [icons] = await Promise.all([loadIcons(card, loadIcon), ready]);
  const svg = await satori(layout(card, icons), { width: WIDTH, height: HEIGHT, fonts: assets.fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: 'original' } });
  try {
    const image = resvg.render();
    try {
      // Copied onto a plain `ArrayBuffer`, which is what a `Response` body accepts.
      return new Uint8Array(image.asPng());
    } finally {
      image.free();
    }
  } finally {
    resvg.free();
  }
};

export const loadIcons = async (card: Card, loadIcon: RenderOptions['loadIcon']): Promise<Icons> => {
  const entries = await Promise.all(
    iconsOf(card).map(async ({ id, color }) => {
      const svg = await loadIcon(id).catch(() => undefined);
      const entry: [string, string][] = svg ? [[iconKey(id, color), colorize(svg, color)]] : [];
      return entry;
    }),
  );
  return new Map(entries.flat());
};

/** Phosphor draws in `currentColor`, which an image has no way to inherit. */
const colorize = (svg: string, color: string): string => svg.replaceAll('currentColor', color);

export const phosphorPath = (id: string): string | undefined => {
  const match = /^ph--([a-z0-9-]+)--(regular|bold|duotone|fill|light|thin)$/.exec(id);
  if (!match) {
    return undefined;
  }
  const [, name, weight] = match;
  return weight === 'regular' ? `/phosphor/regular/${name}.svg` : `/phosphor/${weight}/${name}-${weight}.svg`;
};
