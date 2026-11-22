//
// Copyright 2026 DXOS.org
//

/** The third argument Vite passes to `build.modulePreload.resolveDependencies`. */
export type PreloadHost = { hostId: string; hostType: 'html' | 'js' };

/**
 * `build.modulePreload.resolveDependencies` that keeps the HTML's static preloads (the boot graph)
 * and drops the list Vite's `__vitePreload` helper preloads on each dynamic import.
 *
 * The helper rescans every `<link>` and appends one `modulepreload` per dependency on each import,
 * which cost ~540 ms of main thread before ready across Composer's lazy plugin modules. Vite appends
 * CSS dependencies after this callback, so a lazy chunk's styles still load before it runs.
 */
export const bootPreload = (_filename: string, deps: string[], { hostType }: PreloadHost): string[] =>
  hostType === 'html' ? deps : [];
