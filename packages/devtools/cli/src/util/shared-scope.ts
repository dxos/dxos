//
// Copyright 2026 DXOS.org
//

import { fileURLToPath } from 'node:url';

import { DEFAULT_PACKAGES } from '@dxos/app-framework/SharedPackages';
import { log } from '@dxos/log';

/** Escapes a package name for use inside the shared-scope filter. */
const escape = (specifier: string) => specifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Matches a shared package and any of its subpaths, so `@dxos/app-framework/Plugin` is covered by
 * the same entry as `@dxos/app-framework`. Subpaths are the common case for DXOS packages — a
 * plugin imports `@dxos/app-framework/Plugin`, never the barrel — so a bare-specifier-only scope
 * would leave the real imports resolving to the plugin's own copy.
 */
const buildFilter = (specifiers: readonly string[]) => new RegExp(`^(?:${specifiers.map(escape).join('|')})(?:/|$)`);

/**
 * Points a third-party plugin's imports of shared packages at the host's own modules.
 *
 * Without this a plugin importing `@dxos/echo` resolves to *its own copy* — bun does not fall back
 * to the binary — and host and plugin end up with separate instances of every stateful module:
 * ECHO's schema registry, the capability system, effect service identity. Nothing errors; the
 * plugin's objects simply never match the host's. An installed plugin living outside the host's
 * dependency tree is worse still: its imports do not resolve at all.
 *
 * Implemented as an `onResolve` hook rather than `build.module` because the latter registers exact
 * specifiers, which cannot cover the subpaths that make up nearly every real import. Resolution
 * goes through `import.meta.resolve` *from this module*, so a plugin anywhere on disk gets the
 * host's copy, and the hook hands back a plain path — it never imports, so nothing is evaluated
 * until the plugin actually asks for it.
 *
 * `DEFAULT_PACKAGES` is the same list the Vite plugin externalizes from browser plugin bundles:
 * one contract, honored by both hosts.
 */
export const registerSharedScope = ({ enabled }: { enabled: boolean }): void => {
  // `Bun.plugin` is the runtime's module registry; under plain node there is nothing to register
  // and a third-party plugin resolves through `node_modules` as usual.
  const bun = (globalThis as { Bun?: { plugin?: (options: unknown) => void } }).Bun;
  if (!enabled || !bun?.plugin) {
    return;
  }

  const filter = buildFilter(DEFAULT_PACKAGES);
  try {
    bun.plugin({
      name: 'dx-shared-scope',
      setup: (build: {
        onResolve: (
          options: { filter: RegExp },
          callback: (args: { path: string }) => { path: string } | undefined,
        ) => void;
      }) => {
        build.onResolve({ filter }, ({ path }) => {
          try {
            return { path: fileURLToPath(import.meta.resolve(path)) };
          } catch {
            // Declared shared but absent from this binary (React, deliberately). Leaving it
            // unresolved lets bun fall back to the plugin's own copy, which is the best available
            // answer for a package the host cannot supply.
            return undefined;
          }
        });
      },
    });
    log('registered shared plugin scope', { packages: DEFAULT_PACKAGES.length });
  } catch (error) {
    // A shared scope that fails to register is not fatal for a `dx` with no third-party plugins,
    // which is every invocation until someone runs `dx plugin add`.
    log.warn('failed to register the shared plugin scope', { error });
  }
};
