//
// Copyright 2026 DXOS.org
//

/**
 * Sets a plugin's showcase entry in its `dx.config.ts` `screenshots` list - the light and dark videos the plugin
 * registry plays. An entry is the showcase's when its URLs name `-<pkg>-showcase`, so a re-run replaces it and leaves
 * every other screenshot alone.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/** Replaces (or adds) the showcase entry; returns false when the file has no `plugin` block to add it to. */
export const setShowcaseScreenshot = (file, pkg, { light, dark }) => {
  if (!existsSync(file)) {
    return false;
  }
  const source = readFileSync(file, 'utf8');
  const entry = `{ light: '${light}', dark: '${dark}' }`;
  const showcase = new RegExp(`\\{[^{}]*-${pkg}-showcase[^{}]*\\}`);
  let next;
  if (showcase.test(source)) {
    next = source.replace(showcase, entry);
  } else if (/screenshots:\s*\[/.test(source)) {
    next = source.replace(/screenshots:\s*\[/, (match) => `${match}${entry}, `);
  } else if (/\n(\s*)tags:/.test(source)) {
    next = source.replace(/\n(\s*)tags:/, (match, indent) => `\n${indent}screenshots: [${entry}],${match}`);
  } else {
    const close = source.lastIndexOf('\n  },\n});');
    if (close < 0) {
      return false;
    }
    next = `${source.slice(0, close)}\n    screenshots: [${entry}],${source.slice(close)}`;
  }
  writeFileSync(file, next);
  return true;
};
