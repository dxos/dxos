//
// Copyright 2024 DXOS.org
// Copyright 2024 Will Shown <ch-ui@willshown.com>
// Based upon @tailwindcss/vite, fetched on 9 April 2024 from <https://github.com/tailwindlabs/tailwindcss/blob/next/packages/%40tailwindcss-vite/package.json>
//

// TODO(burdon): Replace with https://github.com/vnphanquang/phosphor-icons-tailwindcss

import { type BundleParams, makeSprite, scanString } from '@ch-ui/icons';
import fs from 'fs';
import { dirname, join, resolve } from 'path';
import picomatch from 'picomatch';
import type { Plugin, ViteDevServer } from 'vite';

import { type IconAssets, iconAssetsPlugin } from './icon-assets.ts';
import { normalizeSprite } from './normalize-sprite.ts';
import { resolveSymbols } from './resolve-symbols.ts';
import { type SymbolPatternParams, WEIGHTS, iconSymbolPattern } from './symbol-pattern.ts';

export { type SymbolPatternParams, WEIGHTS, iconSymbolPattern };

export type { IconAssets };

export type IconsPluginParams = Omit<BundleParams, 'spritePath'> & {
  spriteFile: string;
  /**
   * Globs of files scanned eagerly at build start, in addition to the module
   * graph. Needed for icon names that only occur in sources the build never
   * imports — e.g. descriptors contributed by other packages at runtime (the
   * composer-crx page actions).
   */
  scanPaths?: string[];
  /**
   * Icon-set catalogs to expose as individual SVGs (dev middleware + build-output copy)
   * for runtime icon resolution — icons referenced only by runtime-loaded code that the
   * scanner never sees. Opt-in: hosts that only need the static sprite omit this (e.g.
   * composer-crx, where copying a full catalog would bloat the packaged extension).
   */
  assets?: IconAssets[];
  verbose?: boolean;
};

export const IconsPlugin = ({
  assetPath,
  symbolPattern,
  spriteFile,
  contentPaths,
  scanPaths,
  assets,
  config,
  verbose,
}: IconsPluginParams): Plugin[] => {
  const pms = contentPaths.map((contentPath) => picomatch(contentPath));
  const isContent = (filepath: string) => !!pms.find((pm) => pm(filepath));
  const shouldIgnore = (filepath: string) => !isContent(filepath);

  const detectedSymbols = new Set<string>();
  const scan = (contentString: string) => {
    let updated = false;
    Array.from(scanString({ contentString, symbolPattern })).forEach((candidate) => {
      if (!detectedSymbols.has(candidate)) {
        detectedSymbols.add(candidate);
        updated = true;
      }
    });

    return updated;
  };

  const visitedFiles = new Set<string>();
  const status = { updated: false };

  let rootDir: string;
  let spritePath: string;
  let server: ViteDevServer | null = null;

  // Coalesce sprite writes during dev startup. Without this, every transform
  // that detects a new icon symbol triggers a full `makeSprite()` write to
  // disk; that file lives under publicDir, which fires CSS HMR for every
  // stylesheet referencing it. During a cold-start with many lazy-loaded
  // packages, dozens of new icons are discovered in tight bursts as plugin
  // sources stream through — leading to a "main.css HMR storm" (40+ updates
  // in 1-2 s) and growing esbuild deps-bundle pass times because CSS HMR
  // work contends with the deps optimizer. Coalescing collapses N "new
  // icon" detections in the same idle window into a single write.
  //
  // Also skip the write when the sprite's contents would be identical — a cheap guard against
  // repeating the work when the same icons get re-detected after a reload.
  let writeTimer: NodeJS.Timeout | null = null;
  let lastFingerprint: string | null = null;
  const writeDebounceMs = Number(process.env.DX_ICONS_DEBOUNCE_MS) || 200;

  // Symbols already reported as having no asset, so a rewrite doesn't repeat the warning. A name
  // stays reported until its file appears, at which point the next write picks it up.
  const warnedMissing = new Set<string>();

  const statAsset = (path: string) => {
    try {
      const { mtimeMs, size } = fs.statSync(path);
      return { mtimeMs, size };
    } catch {
      return undefined;
    }
  };

  // Resolved asset files handed to Vite's watcher. They sit outside `contentPaths` (and, for
  // Phosphor, inside node_modules), so nothing would otherwise notice a glyph being redrawn.
  // Registered per file rather than per directory: an icon-set catalog is thousands of SVGs, and
  // watching those directories would cost far more than the few hundred actually in use.
  const watchedAssets = new Set<string>();

  // Directories to watch for a file appearing, for symbols whose asset does not exist yet: a path
  // that isn't there cannot be watched, so the directory stands in for it. Only ever the handful of
  // directories belonging to unresolved names.
  const watchedDirs = new Set<string>();

  const watchAssets = (paths: string[]) => {
    if (!server) {
      return;
    }
    for (const path of paths) {
      if (!watchedAssets.has(path)) {
        watchedAssets.add(path);
        server.watcher.add(path);
      }
    }
  };

  const watchMissing = (paths: string[]) => {
    if (!server) {
      return;
    }
    for (const path of paths) {
      const dir = dirname(path);
      if (!watchedDirs.has(dir) && fs.existsSync(dir)) {
        watchedDirs.add(dir);
        server.watcher.add(dir);
      }
    }
  };

  const warnMissing = (missing: { symbol: string; path: string }[]) => {
    const fresh = missing.filter(({ symbol }) => !warnedMissing.has(symbol));
    if (fresh.length > 0) {
      fresh.forEach(({ symbol }) => warnedMissing.add(symbol));
      console.warn(
        `[icons] No asset for ${fresh.length === 1 ? 'symbol' : 'symbols'}: ` +
          `${fresh.map(({ symbol }) => symbol).join(', ')} — omitted from the sprite, so the icon renders blank. ` +
          'Check the name against the icon set.',
      );
    }
    // Drop names that have since been satisfied, so a later disappearance is reported again.
    const names = new Set(missing.map(({ symbol }) => symbol));
    for (const symbol of warnedMissing) {
      if (!names.has(symbol)) {
        warnedMissing.delete(symbol);
      }
    }
  };

  // Symbols already reported as pinning a color, so a rewrite doesn't repeat the warning.
  const warnedHardcoded = new Set<string>();

  // Forces `fill="currentColor"` onto every symbol `makeSprite` just wrote. A glyph that declares
  // no fill defaults to black and disappears against a dark surface, and vector editors drop the
  // attribute on every re-export — patching the source SVG loses that race. Runs here rather than
  // via svg-sprite's `shape.transform` so it also applies to a caller-supplied `config`.
  const normalizeSpriteFile = () => {
    const { svg, hardcoded } = normalizeSprite(fs.readFileSync(spritePath, 'utf8'));
    fs.writeFileSync(spritePath, svg);
    const fresh = hardcoded.filter((id) => !warnedHardcoded.has(id));
    if (fresh.length > 0) {
      fresh.forEach((id) => warnedHardcoded.add(id));
      console.warn(
        `[icons] Hardcoded color in ${fresh.length === 1 ? 'symbol' : 'symbols'}: ${fresh.join(', ')} — ` +
          'a paint declaration on the glyph itself (a `style` or a `fill`/`stroke` attribute) overrides ' +
          'the symbol fill, so it will not follow the theme. Replace the literal with `currentColor` ' +
          'in the source SVG.',
      );
    }
  };

  // Single source of truth for writing the sprite to disk. Skips the write when the sprite would be
  // byte-identical, and omits symbols with no asset so one bad name cannot fail the write.
  const writeSprite = async () => {
    const { resolved, missing, fingerprint } = resolveSymbols({
      symbols: detectedSymbols,
      symbolPattern,
      assetPath,
      stat: statAsset,
    });
    warnMissing(missing);
    watchMissing(missing.map(({ path }) => path));
    if (fingerprint === lastFingerprint) {
      return;
    }
    // Capture the fingerprint now; advance `lastFingerprint` only after a successful write so a
    // failed `makeSprite` leaves it unchanged and the next call retries instead of skipping.
    const written = fingerprint;
    const symbols = new Set(resolved.map(({ symbol }) => symbol));
    await makeSprite({ assetPath, symbolPattern, spritePath, contentPaths, config }, symbols);
    normalizeSpriteFile();
    lastFingerprint = written;
    watchAssets(resolved.map(({ path }) => path));
    if (verbose) {
      console.log(
        'Sprite updated:',
        JSON.stringify({ path: spritePath, size: symbols.size, symbols: Array.from(symbols).sort() }, null, 2),
      );
    }
  };

  // Cancel any pending debounce and write immediately, coalescing concurrent
  // callers onto a single in-flight write so the sprite is never written twice
  // at once (svg-sprite writes to a fixed path). Returns the write so callers
  // can await a complete sprite on disk.
  let flushing: Promise<void> | null = null;
  const flushSprite = () => {
    if (writeTimer) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
    flushing ??= writeSprite().finally(() => {
      flushing = null;
    });
    return flushing;
  };

  return [
    {
      // Step 1: Scan source files incrementally.
      name: '@ch-ui/icons:scan',
      enforce: 'pre',

      configResolved: (config) => {
        rootDir = resolve(config.root);
        spritePath = resolve(config.publicDir, spriteFile);
      },

      // Eager scan: symbols in files outside the module graph (transform never
      // sees them). Runs for both build and dev server starts.
      buildStart: () => {
        for (const pattern of scanPaths ?? []) {
          for (const filename of fs.globSync(pattern)) {
            try {
              const match = scan(fs.readFileSync(filename, 'utf8'));
              status.updated ||= match;
            } catch {
              // Unreadable entries (e.g. dangling symlinks) are skipped.
            }
          }
        }
      },

      configureServer: (_server) => {
        server = _server;

        // Rebuild when a glyph already in the sprite is redrawn. The sprite is served as a static
        // file, and the icon registry ingests it once per document, so the write alone changes
        // nothing on screen — hence the full reload.
        const rebuild = () => {
          // The watcher has told us the file changed, which is better evidence than the fingerprint:
          // mtime and size can both survive an edit (a same-length change written within the same
          // millisecond), and skipping here would reload the page against the old sprite.
          lastFingerprint = null;
          void flushSprite().then(
            () => server?.hot.send({ type: 'full-reload' }),
            (err) => console.error('[icons] Failed to rebuild the sprite:', err),
          );
        };
        const onAssetChange = (file: string) => watchedAssets.has(file) && rebuild();
        // An `add` under a watched directory is the asset a reported-missing symbol was waiting for.
        const onAssetAdd = (file: string) => watchedDirs.has(dirname(file)) && rebuild();
        server.watcher.on('change', onAssetChange);
        server.watcher.on('unlink', onAssetChange);
        server.watcher.on('add', onAssetAdd);

        // Ensure `/icons.svg` is complete before it is served. On a cold start
        // the browser requests the sprite as soon as the first <Icon> paints —
        // often before the debounced write has flushed, or before the file
        // exists at all on a fresh checkout (the sprite lives in gitignored
        // publicDir). Either case yields blank icons until a hard reload.
        // Flushing here guarantees the served sprite reflects every symbol
        // detected so far. Registered before the scan middleware (and thus
        // before Vite's public-dir serving) so the write lands first.
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url ?? '').split('?')[0];
          if (pathname === `/${spriteFile}` && (writeTimer || !fs.existsSync(spritePath))) {
            void flushSprite().then(next, next);
            return;
          }
          next();
        });

        // Process chunks.
        server.middlewares.use((req, res, next) => {
          const url = req.url ?? '';
          // Skip plugin-resolved virtual modules — these aren't files on disk.
          // Conventions:
          //   `/virtual:` — legacy Vite convention.
          //   `/@id/`     — Vite's URL form for `resolveId`-returned IDs, including
          //                 Rolldown's null-byte (`\0`) prefix encoded as `__x00__`.
          if (url.includes('/virtual:') || url.includes('/@id/')) {
            return next();
          }
          const match = url.match(/^(\/@fs)?(.+)\.(\w+)$/);
          if (match) {
            const [, prefix, path, ext] = match;
            const filename = join((prefix ? '' : rootDir) + `${path}.${ext}`);
            if (!visitedFiles.has(filename)) {
              visitedFiles.add(filename);
              // TODO(burdon): Check if matches contentPaths (incl. mjs).
              const extensions = ['js', 'ts', 'jsx', 'tsx', 'mjs'];
              if (extensions.some((e) => e === ext) && path.indexOf('node_modules') === -1) {
                try {
                  const src = fs.readFileSync(filename, 'utf8');
                  const match = scan(src);
                  status.updated ||= match;
                } catch {
                  console.error('Missing file', url);
                }
              }
            }
          }
          next();
        });
      },

      transformIndexHtml: (html) => {
        const match = scan(html);
        status.updated ||= match;
      },

      transform: (src, id) => {
        if (!shouldIgnore(id)) {
          const match = scan(src);
          status.updated ||= match;
        }
      },
    },
    {
      // Step 2: Write sprite.
      // NOTE: This must run before the public directory is copied.
      name: '@ch-ui/icons:write',
      transform: () => {
        if (!status.updated) {
          return;
        }
        status.updated = false;
        // Debounce: every flip of `status.updated` resets the timer; only
        // when no new icon has been detected for `writeDebounceMs` does the
        // write actually happen. Bursts during cold-start collapse into one
        // write instead of N.
        if (writeTimer) {
          clearTimeout(writeTimer);
        }
        writeTimer = setTimeout(() => {
          writeTimer = null;
          // Route through `flushSprite` (not `writeSprite`) so a concurrent
          // `/icons.svg` request coalesces onto this same in-flight write
          // instead of racing it. No-op when the sprite would be unchanged.
          // Caught, not discarded: nothing awaits this, so a rejection would reach the process as
          // an unhandled rejection and exit the dev server. `buildEnd` still awaits and so still
          // fails a production build.
          void flushSprite().catch((err) => console.error('[icons] Failed to write the sprite:', err));
        }, writeDebounceMs);
      },
      // Force a final write at build close so production builds aren't
      // missing icons that were detected during the very last transforms.
      buildEnd: async () => {
        await flushSprite();
      },
    },
    ...(assets ?? []).map(iconAssetsPlugin),
  ] satisfies Plugin[];
};
