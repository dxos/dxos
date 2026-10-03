//
// Copyright 2026 DXOS.org
//

//
// PNG renderings of standalone SVGs (`toSvgFile`), rasterized by headless Chromium for judges that read images.
//

import { chromium } from '@playwright/test';
import type * as DecisionModel from 'effect/ai/DecisionModel';

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
