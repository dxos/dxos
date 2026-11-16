//
// Copyright 2026 DXOS.org
//

import { PluginLoader } from '@dxos/edge-compute/plugin-loader';
import { invariant } from '@dxos/invariant';

/** One file of a built bundle, as the registry's upload takes it. */
export type BundleFile = { path: string; content: Uint8Array<ArrayBuffer> };

/** Semver build metadata: dot-separated alphanumeric identifiers. */
const BUILD_RE = /^[0-9a-z-]+(\.[0-9a-z-]+)*$/i;

/**
 * Stamps `build` onto the bundle's version, rewriting its `manifest.json` too: EDGE rejects an upload whose manifest
 * names another version.
 */
export const withBuild = (
  files: BundleFile[],
  version: string,
  build: string,
): { version: string; files: BundleFile[] } => {
  invariant(BUILD_RE.test(build), `Invalid build id: ${build}`);
  const stamped = `${version.split('+')[0]}+${build}`;
  return {
    version: stamped,
    files: files.map((file) => {
      if (file.path !== PluginLoader.MANIFEST_FILE) {
        return file;
      }
      const manifest = { ...JSON.parse(new TextDecoder().decode(file.content)), version: stamped };
      return { path: file.path, content: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) };
    }),
  };
};
