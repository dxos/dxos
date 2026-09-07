//
// Copyright 2026 DXOS.org
//

// Resolved lazily so dx-compile doesn't take a build-time package dep on
// @dxos/vite-plugin-log (which would create a moon cycle:
//   dx-compile:compile -> ^:build -> vite-plugin-log:build -> ts-build's
//   compile -> dx-compile:compile).
export type LogMetaTransformFn = (code: string, filename: string) => string | null;

let _logMetaTransform: LogMetaTransformFn | null | undefined;
let _didWarnLogMetaLoadFailure = false;

/**
 * Loads `transformLogMeta` from `@dxos/vite-plugin-log`, or returns `null` when the package
 * is not built yet (self-bootstrapping) — callers then skip log-meta injection.
 */
export const loadLogMetaTransform = async (): Promise<LogMetaTransformFn | null> => {
  if (_logMetaTransform !== undefined) {
    return _logMetaTransform;
  }

  try {
    // Specifier built dynamically so TypeScript's bundler resolution doesn't try
    // to type-check the package at dx-compile build time. dx-compile must build
    // standalone (no vite-plugin-log dep on its compile graph) — but at run time
    // the package is always available because every consumer that runs dx-compile
    // already has @dxos/vite-plugin-log resolved (root devDependency).
    //
    // The `/transform` subpath is deliberate: the package barrel also exports the Vite
    // plugin, and evaluating `vite` inside an esbuild build that is itself already running
    // under a Vite module runner fails (a partially-initialized `vite` module graph).
    const specifier = ['@dxos', 'vite-plugin-log', 'transform'].join('/');
    const mod = (await import(specifier)) as { transformLogMeta?: LogMetaTransformFn };
    _logMetaTransform = mod.transformLogMeta ?? null;
  } catch (err) {
    // ERR_MODULE_NOT_FOUND / ERR_PACKAGE_PATH_NOT_EXPORTED are the expected cases when
    // vite-plugin-log itself is self-bootstrapping. Anything else is a real regression —
    // warn once so we don't silently drop log-meta injection across the rest of the build.
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    const isMissing = code === 'ERR_MODULE_NOT_FOUND' || code === 'ERR_PACKAGE_PATH_NOT_EXPORTED';
    if (!isMissing && !_didWarnLogMetaLoadFailure) {
      _didWarnLogMetaLoadFailure = true;
      const message = err instanceof Error ? (err.stack ?? err.message) : String(err);
      console.warn(`dx-compile: failed to load \`@dxos/vite-plugin-log\`; continuing without log-meta injection.
${message}`);
    }
    _logMetaTransform = null;
  }

  return _logMetaTransform;
};
