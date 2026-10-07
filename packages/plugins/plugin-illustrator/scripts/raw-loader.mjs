//
// Copyright 2026 DXOS.org
//

//
// Node loader for Vite's `?raw` imports (`@dxos/diagram` reads its rule library that way), so the
// render scripts can run from source under plain `node --import tsx` and its worker threads.
// Register it after tsx: hooks run last-registered first, so `?raw` is answered before tsx sees it.
//

import { readFile } from 'node:fs/promises';
import { register } from 'node:module';

const SUFFIX = '?raw';

/** Resolves the path without the suffix, then keeps the suffix on the URL so `load` knows to read it as text. */
export const resolve = async (specifier, context, nextResolve) => {
  if (!specifier.endsWith(SUFFIX)) {
    return nextResolve(specifier, context);
  }
  const resolved = await nextResolve(specifier.slice(0, -SUFFIX.length), context);
  return { ...resolved, url: `${resolved.url}${SUFFIX}`, format: 'module', shortCircuit: true };
};

/** Serves the file's text as the module's default export. */
export const load = async (url, context, nextLoad) => {
  if (!url.endsWith(SUFFIX)) {
    return nextLoad(url, context);
  }
  const text = await readFile(new URL(url.slice(0, -SUFFIX.length)), 'utf8');
  return { format: 'module', source: `export default ${JSON.stringify(text)};`, shortCircuit: true };
};

// The hooks thread imports this module again; the query marks that copy so it does not register itself.
if (!import.meta.url.endsWith('?hooks')) {
  register(`${import.meta.url}?hooks`);
}
