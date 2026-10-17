//
// Copyright 2026 DXOS.org
//

/**
 * Injects a plain-DOM UI module (a `tools/autocue` component core, react-ui-experimental's countdown) into a
 * recorded page, where there is no module resolution: the file is bundled to an IIFE that assigns `globalName`.
 */

import { fileURLToPath } from 'node:url';

const REPO = new URL('../../../../', import.meta.url);

/** `tools/autocue`'s Frame core: the title and caption bands painted over a recording. */
export const FRAME_MODULE = new URL('tools/autocue/src/components/Frame/create-frame.ts', REPO);

/** react-ui-experimental's countdown, the DOM half of its `Countdown` component. */
export const COUNTDOWN_MODULE = new URL(
  'packages/ui/react-ui-experimental/src/components/Countdown/play-countdown.ts',
  REPO,
);

/** Bundled once per module, on first use: esbuild is the repo's own. */
const bundles = new Map();

export const bundleModule = async (file, globalName) => {
  const key = `${file.href}#${globalName}`;
  if (!bundles.has(key)) {
    const { build } = await import('esbuild');
    const { outputFiles } = await build({
      // Decoded, so a checkout path with spaces resolves (a URL's `pathname` keeps them percent-encoded).
      entryPoints: [fileURLToPath(file)],
      bundle: true,
      format: 'iife',
      globalName,
      platform: 'browser',
      write: false,
      logLevel: 'silent',
      // The bundle's `"use strict"` prologue keeps its `var` local to the evaluation, so the global is set explicitly.
      footer: { js: `globalThis.${globalName} = ${globalName};` },
    });
    bundles.set(key, outputFiles[0].text);
  }
  return bundles.get(key);
};

/**
 * Evaluates the bundle in the page unless `window[globalName]` already exists; a navigation clears it, so callers
 * inject before every use. Run as a script through the protocol rather than `eval`, so a page's content security
 * policy cannot refuse it.
 *
 * @param {import('@playwright/test').Page} page
 */
export const injectModule = async (page, file, globalName) => {
  if (!(await page.evaluate((name) => Boolean(window[name]), globalName))) {
    await page.evaluate(await bundleModule(file, globalName));
  }
};
