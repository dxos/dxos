//
// Copyright 2026 DXOS.org
//

import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import Inspect from 'vite-plugin-inspect';

import { DxosLogPlugin } from '../src/plugin.ts';

/**
 * Transform-meta probe. Logs the shape of the `meta` argument passed to Vite's
 * `transform` hook so we can confirm whether `ast` / `magicString` are exposed
 * natively.
 *
 * Finding (vite@8.0.10, rolldown@1.0.0-rc.17):
 *   The Vite plugin pipeline receives `meta = { moduleType, ssr }`. Rolldown
 *   does install `ast` and `magicString` as non-enumerable lazy getters on its
 *   own meta object, but Vite's `wrapEnvironmentTransform` -> `injectSsrFlag`
 *   uses `{ ...options, ssr }` object spread, which only copies enumerable own
 *   properties — so the getters are stripped before the hook runs.
 *
 * The pure-Rolldown scenario is demonstrated by `probe-rolldown.mjs` in this
 * directory, which bypasses Vite entirely.
 */
const transformMetaProbe = (): Plugin => {
  const seen = new Set<string>();
  return {
    name: 'dxos:probe-transform-meta',
    enforce: 'pre',
    transform: {
      filter: {
        id: { exclude: /node_modules|\\0/ },
        moduleType: { include: ['js', 'jsx', 'ts', 'tsx'] },
      },
      handler(_code: string, id: string, meta: unknown) {
        if (seen.has(id)) {
          return null;
        }
        seen.add(id);
        const keys = meta && typeof meta === 'object' ? Object.keys(meta as object) : [];
        const ownNames = meta && typeof meta === 'object' ? Object.getOwnPropertyNames(meta as object) : [];
        const astValue = meta != null && typeof meta === 'object' ? (meta as { ast?: unknown }).ast : undefined;
        const magicStringValue =
          meta != null && typeof meta === 'object' ? (meta as { magicString?: unknown }).magicString : undefined;
        const astType = astValue != null ? (astValue?.constructor?.name ?? typeof astValue) : 'undefined';
        const msType =
          magicStringValue != null ? (magicStringValue?.constructor?.name ?? typeof magicStringValue) : 'undefined';
        // eslint-disable-next-line no-console
        console.log(
          `[probe] id=${id}\n  enumerable keys=${JSON.stringify(keys)}\n  ownPropertyNames=${JSON.stringify(ownNames)}\n  ast=${astType}\n  magicString=${msType}`,
        );
        return null;
      },
    } as Plugin['transform'],
  };
};

export default defineConfig({
  root: __dirname,
  plugins: [transformMetaProbe(), DxosLogPlugin(), Inspect()],
  server: {
    port: 3000,
  },
});
