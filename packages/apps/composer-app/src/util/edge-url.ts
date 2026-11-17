//
// Copyright 2026 DXOS.org
//

export type EdgeConfig = { runtime?: { services?: { edge?: { url?: string } } } };

// Injected by `@dxos/config`'s esbuild plugin (`scripts/build-worker.mjs`) from the files the page is built with.
declare const __CONFIG_ENVS__: EdgeConfig | undefined;
declare const __CONFIG_LOCAL__: EdgeConfig | undefined;
declare const __CONFIG_DEFAULTS__: EdgeConfig | undefined;

const edgeOf = (config: EdgeConfig | undefined): string | undefined => config?.runtime?.services?.edge?.url;

/**
 * The EDGE origin, resolved as the page's config is: `DX_EDGE_BASE_URL` (through `dx-env.yml`), then `dx-local.yml`
 * (outside production), then `dx.yml`.
 */
export const resolveEdgeUrl = (
  envs: EdgeConfig | undefined,
  local: EdgeConfig | undefined,
  defaults: EdgeConfig | undefined,
): string | undefined => edgeOf(envs) ?? edgeOf(local) ?? edgeOf(defaults);

/** The EDGE origin the worker's build was configured with. */
export const edgeUrl = (): string | undefined =>
  resolveEdgeUrl(
    typeof __CONFIG_ENVS__ !== 'undefined' ? __CONFIG_ENVS__ : undefined,
    typeof __CONFIG_LOCAL__ !== 'undefined' ? __CONFIG_LOCAL__ : undefined,
    typeof __CONFIG_DEFAULTS__ !== 'undefined' ? __CONFIG_DEFAULTS__ : undefined,
  );
