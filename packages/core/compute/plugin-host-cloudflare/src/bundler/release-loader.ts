//
// Copyright 2026 DXOS.org
//

import { Miniflare } from 'miniflare';

import type * as PluginCatalog from '../PluginCatalog.ts';
import type * as PluginHost from '../PluginHost.ts';
import * as PluginRelease from '../PluginRelease.ts';

/** A release loaded into workerd, driven from Node. */
export interface LoadedRelease extends AsyncDisposable {
  readonly manifest: PluginRelease.Manifest;
  describe(): Promise<PluginCatalog.Catalog>;
  invoke(request: PluginHost.InvokeRequest): Promise<unknown>;
}

/**
 * A worker that loads the release it is bound to through Worker Loader, as compute-service does, and forwards each
 * `{ method, request }` call to the release's entrypoint.
 */
const LOADER_HOST = `
const decode = (base64) => Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

export default {
  async fetch(request, env) {
    const manifest = env.MANIFEST;
    const worker = env.LOADER.get('plugin:' + manifest.hash, () => {
      const modules = {};
      for (const [path, content] of Object.entries(env.RELEASE)) {
        if (/\\.(js|mjs)$/.test(path)) {
          modules[path] = new TextDecoder().decode(decode(content));
        } else if (path.endsWith('.wasm')) {
          modules[path] = { wasm: decode(content).buffer };
        }
      }
      return {
        compatibilityDate: manifest.compatibilityDate,
        compatibilityFlags: manifest.compatibilityFlags,
        mainModule: manifest.mainModule,
        modules,
        globalOutbound: null,
      };
    });
    const entrypoint = worker.getEntrypoint();
    const { method, request: call } = await request.json();
    try {
      const result = method === 'describe' ? await entrypoint.describe() : await entrypoint.invoke(call);
      return Response.json({ result });
    } catch (error) {
      return Response.json({ error: { name: error?.name, message: error?.message } }, { status: 500 });
    }
  },
};
`;

/** What {@link LOADER_HOST} answers with. */
type CallResult<T> = { result: T } | { error: { name?: string; message?: string } };

/** Loads a bundled release through Worker Loader in a local workerd. */
export const loadRelease = async (files: PluginRelease.Files): Promise<LoadedRelease> => {
  const manifest = await PluginRelease.makeManifest(files);
  const miniflare = new Miniflare({
    modules: true,
    script: LOADER_HOST,
    compatibilityDate: PluginRelease.COMPATIBILITY_DATE,
    compatibilityFlags: [...PluginRelease.COMPATIBILITY_FLAGS],
    workerLoaders: { LOADER: {} },
    bindings: {
      MANIFEST: manifest,
      RELEASE: Object.fromEntries(
        Object.entries(files).map(([path, content]) => [path, Buffer.from(content).toString('base64')]),
      ),
    },
  });

  const call = async <T>(method: 'describe' | 'invoke', request?: PluginHost.InvokeRequest): Promise<T> => {
    const response = await miniflare.dispatchFetch('http://release.local/', {
      method: 'POST',
      body: JSON.stringify({ method, request }),
    });
    // The answer comes from LOADER_HOST, whose shape this module owns.
    const body: CallResult<T> = JSON.parse(await response.text());
    if ('error' in body) {
      throw new Error(`${body.error.name ?? 'Error'}: ${body.error.message ?? 'release call failed'}`);
    }
    return body.result;
  };

  return {
    manifest,
    describe: () => call<PluginCatalog.Catalog>('describe'),
    invoke: (request) => call<unknown>('invoke', request),
    [Symbol.asyncDispose]: () => miniflare.dispose(),
  };
};
