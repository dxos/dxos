//
// Copyright 2026 DXOS.org
//

/** The third argument Vite passes to `build.modulePreload.resolveDependencies`. */
export type PreloadHost = { hostId: string; hostType: 'html' | 'js' };

export type ResolveDependencies = (filename: string, deps: string[], context: PreloadHost) => string[];

export type BootPreloadOptions = {
  /**
   * Chunks whose dynamic imports keep their preload list. Unset, every dynamic import drops it;
   * set, only imports made from a matching chunk (the boot graph) keep theirs.
   */
  isBootHost?: (hostId: string) => boolean;
};

/**
 * `build.modulePreload.resolveDependencies` that keeps the HTML's static preloads (the boot graph)
 * and drops the ones Vite's `__vitePreload` helper would add at runtime for a lazy chunk.
 *
 * The helper scans every `<link>` in the document and appends one `modulepreload` per dependency on
 * each dynamic import, so with ~270 lazy plugin modules it cost ~540 ms of main thread before ready.
 * CSS dependencies are not passed here (Vite appends them after this callback), so lazy styles
 * still load before their module runs.
 */
export const bootPreload =
  ({ isBootHost }: BootPreloadOptions = {}): ResolveDependencies =>
  (_filename, deps, { hostId, hostType }) => {
    if (hostType === 'html') {
      return deps;
    }
    return isBootHost?.(hostId) ? deps : [];
  };
