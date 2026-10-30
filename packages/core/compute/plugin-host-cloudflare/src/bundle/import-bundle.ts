//
// Copyright 2026 DXOS.org
//

import { Miniflare } from 'miniflare';

import * as PluginRelease from '../PluginRelease.ts';
import * as PluginBundle from './PluginBundle.ts';

/** Why one module failed to import. */
export type ImportFailure = { readonly path: string; readonly message: string };

/** A host worker that loads the bundle through Worker Loader and imports each root module once, in a request. */
const IMPORT_HOST = `
const MAIN = '__check_imports__.js';

export default {
  async fetch(request, env) {
    const worker = env.LOADER.get('bundle', () => {
      const modules = { [MAIN]: ${JSON.stringify(`
        export default {
          async fetch(request) {
            const failures = [];
            for (const path of await request.json()) {
              try {
                await import('./' + path);
              } catch (error) {
                failures.push({ path, message: String(error?.stack ?? error) });
              }
            }
            return Response.json(failures);
          },
        };
      `)} };
      for (const [path, content] of Object.entries(env.FILES)) {
        const bytes = Uint8Array.from(atob(content), (char) => char.charCodeAt(0));
        if (/\\.(js|mjs)$/.test(path)) {
          modules[path] = { js: new TextDecoder().decode(bytes) };
        } else if (path.endsWith('.wasm')) {
          modules[path] = { wasm: bytes.buffer };
        }
      }
      return {
        compatibilityDate: env.COMPATIBILITY_DATE,
        compatibilityFlags: env.COMPATIBILITY_FLAGS,
        mainModule: MAIN,
        modules,
        globalOutbound: null,
      };
    });
    return worker.getEntrypoint().fetch(request);
  },
};
`;

/**
 * Imports `roots` of a bundle in workerd through Worker Loader, after rewriting its bare imports to `vendor/` as EDGE's
 * loader does. Only JavaScript and WebAssembly reach the module map, so a stylesheet a workerd module imports fails here
 * as it would on EDGE.
 */
export const importInWorkerd = async (
  files: PluginBundle.Files,
  vendor: PluginBundle.VendorMap,
  roots: readonly string[],
): Promise<readonly ImportFailure[]> => {
  const rewritten = PluginBundle.rewriteImports(files, vendor);
  const miniflare = new Miniflare({
    modules: true,
    script: IMPORT_HOST,
    compatibilityDate: PluginRelease.COMPATIBILITY_DATE,
    compatibilityFlags: [...PluginRelease.COMPATIBILITY_FLAGS],
    workerLoaders: { LOADER: {} },
    bindings: {
      COMPATIBILITY_DATE: PluginRelease.COMPATIBILITY_DATE,
      COMPATIBILITY_FLAGS: [...PluginRelease.COMPATIBILITY_FLAGS],
      FILES: Object.fromEntries(
        Object.entries(rewritten).map(([path, content]) => [path, Buffer.from(content).toString('base64')]),
      ),
    },
  });
  try {
    const response = await miniflare.dispatchFetch('http://bundle.local/', {
      method: 'POST',
      body: JSON.stringify(roots),
    });
    const body = await response.text();
    if (!response.ok) {
      return [{ path: '', message: `workerd answered ${response.status}: ${body}` }];
    }
    const failures: ImportFailure[] = JSON.parse(body);
    return failures;
  } finally {
    await miniflare.dispose();
  }
};
