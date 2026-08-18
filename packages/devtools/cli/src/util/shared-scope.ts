//
// Copyright 2026 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_PACKAGES } from '@dxos/app-framework/SharedPackages';
import { log } from '@dxos/log';

/** How far up from a resolved entry module to look for its package root. */
const PACKAGE_ROOT_DEPTH = 8;

/**
 * Reads a package's non-wildcard subpath exports, so `@dxos/app-framework/Plugin` can be
 * registered alongside `@dxos/app-framework`.
 *
 * Subpaths are the common case — a plugin imports `@dxos/app-framework/Plugin`, never the barrel —
 * and the registry matches exact specifiers, so a bare-specifier-only scope would leave every
 * import that matters resolving to the plugin's own copy. The package root is found by walking up
 * from the resolved entry rather than resolving `<pkg>/package.json`, which most packages do not
 * export.
 */
const readSubpaths = (pkg: string, entry: string): string[] => {
  let dir = path.dirname(entry);
  for (let depth = 0; depth < PACKAGE_ROOT_DEPTH && dir !== path.dirname(dir); ++depth) {
    const manifest = path.join(dir, 'package.json');
    try {
      const parsed = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (parsed.name === pkg) {
        return (
          Object.keys(parsed.exports ?? {})
            // Wildcard keys cannot be enumerated statically; `.` is the bare specifier, already added.
            .filter((key) => key.startsWith('./') && !key.includes('*'))
            .map((key) => `${pkg}${key.slice(1)}`)
        );
      }
    } catch {
      // Not this package's manifest, or unreadable — keep walking.
    }
    dir = path.dirname(dir);
  }
  return [];
};

/** Every shared specifier this binary can serve, paired with the file it resolves to. */
const collectSharedModules = (): Array<[specifier: string, url: string]> => {
  const modules: Array<[string, string]> = [];
  for (const pkg of DEFAULT_PACKAGES) {
    let entryUrl: string;
    try {
      entryUrl = import.meta.resolve(pkg);
    } catch {
      // Declared shared by the browser host but absent from this binary (React, deliberately).
      continue;
    }
    modules.push([pkg, entryUrl]);
    for (const subpath of readSubpaths(pkg, fileURLToPath(entryUrl))) {
      try {
        modules.push([subpath, import.meta.resolve(subpath)]);
      } catch {
        // An export key that does not resolve under this platform's conditions.
      }
    }
  }
  return modules;
};

/**
 * Points a third-party plugin's imports of shared packages at the host's own modules.
 *
 * Without this a plugin importing `@dxos/echo` resolves to *its own copy* — and a plugin installed
 * under `plugins/<id>/` has no `node_modules` above it at all, so bun auto-installs a *published*
 * `@dxos/*` from its cache. Either way host and plugin end up with separate instances of every
 * stateful module: ECHO's schema registry, the capability system, effect service identity.
 *
 * Registration is `build.module`, not `onResolve`. Measured on bun 1.3.11: the runtime ESM loader
 * never consults `onResolve` — it is a bundler hook — while `build.module` is honored and takes
 * precedence over auto-install. Each factory imports a **pre-resolved file URL** rather than its
 * own specifier, because `build.module` intercepts every import of that specifier including the
 * factory's own, and a self-import recurses into the registry and hangs the CLI before it runs any
 * command.
 *
 * Gated on there being an installed plugin: enumeration costs a resolve and a manifest read per
 * shared package (~7 ms), and an invocation with nothing to share should not pay it. Nothing is
 * imported here — the factories are lazy, so a registered package is only evaluated if a plugin
 * actually asks for it.
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

  try {
    const modules = collectSharedModules();
    bun.plugin({
      name: 'dx-shared-scope',
      setup: (build: {
        module: (specifier: string, factory: () => Promise<{ exports: unknown; loader: string }>) => void;
      }) => {
        for (const [specifier, url] of modules) {
          build.module(specifier, async () => ({ exports: await import(/* @vite-ignore */ url), loader: 'object' }));
        }
      },
    });
    log('registered shared plugin scope', { specifiers: modules.length, declared: DEFAULT_PACKAGES.length });
  } catch (error) {
    // A shared scope that fails to register is not fatal for a `dx` with no third-party plugins,
    // which is every invocation until someone runs `dx plugin add`.
    log.warn('failed to register the shared plugin scope', { error });
  }
};
