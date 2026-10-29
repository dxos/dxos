//
// Copyright 2026 DXOS.org
//

import type * as PluginCatalog from '../PluginCatalog.ts';
import type * as PluginRelease from '../PluginRelease.ts';
import { type BundlePluginOptions, bundlePlugin } from './bundle-plugin.ts';
import { loadRelease } from './release-loader.ts';

export type ReleaseCheck = {
  readonly manifest: PluginRelease.Manifest;
  readonly catalog: PluginCatalog.Catalog;
  /** Bytes of the modules a Dynamic Worker loads, source maps excluded. */
  readonly moduleBytes: number;
  /** Why the release is not fit to publish; empty when it is. */
  readonly problems: readonly string[];
};

/** What the Workers runtime provides; anything else a release imports, it must contain. */
const isRuntimeModule = (specifier: string): boolean =>
  specifier.startsWith('cloudflare:') || specifier.startsWith('node:');

/**
 * Bundles a plugin as an EDGE release, loads it through Worker Loader in workerd, and reports whether it is fit to
 * publish: self-contained, every module activated, and contributing something.
 */
export const checkRelease = async (options: BundlePluginOptions): Promise<ReleaseCheck> => {
  const { assets, externals } = await bundlePlugin(options);
  await using release = await loadRelease(assets);
  const catalog = await release.describe();
  const problems = [
    ...externals
      .filter((specifier) => !isRuntimeModule(specifier))
      .map((specifier) => `imports a module the release does not contain: ${specifier}`),
    ...catalog.failures.map(({ id, phase, message }) => `module ${id} failed to ${phase}: ${message}`),
    ...(catalog.operations.length + catalog.skills.length + catalog.types.length === 0
      ? ['contributes no operations, skills or types on EDGE']
      : []),
  ];
  const moduleBytes = Object.entries(assets)
    .filter(([path]) => !path.endsWith('.map'))
    .reduce((total, [, content]) => total + content.byteLength, 0);
  return { manifest: release.manifest, catalog, moduleBytes, problems };
};
