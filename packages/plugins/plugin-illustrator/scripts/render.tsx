//
// Copyright 2026 DXOS.org
//

//
// Standalone renderings of a laid-out scene for the scripts: an SVG file, and a PNG rasterized from it by
// headless Chromium for judges that read images.
//

import { chromium } from '@playwright/test';
import type * as DecisionModel from 'effect/ai/DecisionModel';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { type Scene, UmlGrid } from '@dxos/diagram';

import { SceneSvg } from '../src/components/SceneSvg.tsx';

/**
 * The renderer styles with Tailwind utilities; a file on disk has no stylesheet, so the export
 * inlines the handful it uses (light theme, Tailwind's neutral palette).
 */
const STYLE = `
  svg { font-family: ui-sans-serif, system-ui, sans-serif; color: #262626; background: #ffffff; }
  .stroke-current { stroke: currentColor; }
  .fill-current { fill: currentColor; }
  .fill-transparent { fill: transparent; }
  .fill-none { fill: none; }
  .stroke-none { stroke: none; }
  .fill-neutral-100 { fill: #f5f5f5; }
  .fill-neutral-800 { fill: #262626; }
  .stroke-neutral-800 { stroke: #262626; }
  svg { --surface-bg: #ffffff; }
  .text-neutral-400 { color: #a3a3a3; }
  .text-sky-500 { color: #0ea5e9; }
  .text-emerald-500 { color: #10b981; }
  .text-amber-500 { color: #f59e0b; }
  .text-violet-500 { color: #8b5cf6; }
  .text-orange-500 { color: #f97316; }
  .text-rose-500 { color: #f43f5e; }
  .stroke-neutral-500\\/20 { stroke: rgba(115, 115, 115, 0.2); }
`;

/** Standalone SVG: the component's markup plus width/height from its viewBox and the inline styles. */
export const toSvg = (objects: readonly Scene.WorldObject[]): string => {
  const markup = renderToStaticMarkup(<SceneSvg objects={objects} grid={UmlGrid.GRID} />);
  const viewBox = /viewBox="([^"]+)"/.exec(markup)?.[1].split(' ').map(Number) ?? [0, 0, 0, 0];
  return markup
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${viewBox[2]}" height="${viewBox[3]}" `)
    .replace('<defs>', `<style>${STYLE}</style><defs>`);
};

/**
 * Rasterizes SVGs to PNG images with one browser. `CHROMIUM_PATH` overrides the executable, for a
 * sandbox whose preinstalled Chromium does not match this Playwright release.
 */
export const toPngs = async (svgs: readonly string[]): Promise<DecisionModel.Image[]> => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const page = await browser.newPage();
    const pngs: DecisionModel.Image[] = [];
    for (const svg of svgs) {
      await page.setContent(`<html><body style="margin:0">${svg}</body></html>`);
      const png = await page.locator('svg').first().screenshot();
      pngs.push({ mediaType: 'image/png', data: png.toString('base64') });
    }
    return pngs;
  } finally {
    await browser.close();
  }
};
