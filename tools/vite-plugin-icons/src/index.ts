//
// Copyright 2024 DXOS.org
// Copyright 2024 Will Shown <ch-ui@willshown.com>
// Based upon @tailwindcss/vite, fetched on 9 April 2024 from <https://github.com/tailwindlabs/tailwindcss/blob/next/packages/%40tailwindcss-vite/package.json>
//

// TODO(burdon): Replace with https://github.com/vnphanquang/phosphor-icons-tailwindcss

import { type BundleParams, makeSprite, scanString } from '@ch-ui/icons';
import fs from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import picomatch from 'picomatch';
import type { Connect, Plugin, ViteDevServer } from 'vite';

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

  let rootDir: string;
  let spritePath: string;
  // Where a build writes the sprite, so the public-dir copy step ships it.
  let publicSpritePath: string;
  // The dev server's private sprite directory, removed when the server closes.
  let devSpriteDir: string | null = null;
  let server: ViteDevServer | null = null;

  // Coalesce sprite writes during dev startup: a cold start discovers dozens of new icons in tight
  // bursts as plugin sources stream through, and each write is a full `makeSprite()`. Coalescing
  // collapses N detections in the same idle window into a single write.
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
  // A flush requested mid-write: that write read the symbol set before the new detection, so it
  // runs again once the write settles rather than coalescing onto it.
  let rerun = false;
  const flushSprite = (): Promise<void> => {
    if (writeTimer) {
      clearTimeout(writeTimer);
      writeTimer = null;
    }
    if (flushing) {
      rerun = true;
      // Settles with the follow-up write, which `finally` below has started by then.
      return flushing.then(() => flushing ?? undefined);
    }
    flushing = writeSprite().finally(() => {
      flushing = null;
      if (rerun) {
        rerun = false;
        void flushSprite().catch((err) => console.error('[icons] Failed to write the sprite:', err));
      }
    });
    return flushing;
  };

  // Debounce: every new detection resets the timer; only when no new icon has been detected for
  // `writeDebounceMs` does the write happen, so bursts during cold start collapse into one write.
  // Every scan path calls this — a symbol found by the request middleware used to wait for some
  // unrelated later transform, and was never written when none came.
  const scheduleWrite = () => {
    if (writeTimer) {
      clearTimeout(writeTimer);
    }
    writeTimer = setTimeout(() => {
      writeTimer = null;
      // Through `flushSprite` so a concurrent `/icons.svg` request coalesces onto this write. Caught:
      // nothing awaits it, and an unhandled rejection would exit the dev server; `buildEnd` still
      // awaits and so still fails a production build.
      void flushSprite().catch((err) => console.error('[icons] Failed to write the sprite:', err));
    }, writeDebounceMs);
  };

  /** Records a scan result, scheduling a write when it found anything new. */
  const noteScan = (updated: boolean) => {
    if (updated) {
      scheduleWrite();
    }
  };

  return [
    {
      // Step 1: Scan source files incrementally.
      name: '@ch-ui/icons:scan',
      enforce: 'pre',

      configResolved: (config) => {
        rootDir = resolve(config.root);
        publicSpritePath = resolve(config.publicDir, spriteFile);
        spritePath = publicSpritePath;
      },

      // Eager scan: symbols in files outside the module graph (transform never
      // sees them). Runs for both build and dev server starts.
      buildStart: () => {
        for (const pattern of scanPaths ?? []) {
          for (const filename of fs.globSync(pattern)) {
            try {
              noteScan(scan(fs.readFileSync(filename, 'utf8')));
            } catch {
              // Unreadable entries (e.g. dangling symlinks) are skipped.
            }
          }
        }
      },

      configureServer: (_server) => {
        server = _server;

        // Every dev server owns a private sprite rather than sharing the public-dir file: the shared
        // storybook and each storybook vitest run load one config and so one publicDir, and whichever
        // wrote last — usually a test run that saw a handful of modules — replaced the sprite the
        // others served, which then never rewrote it because their own symbol set had not changed.
        devSpriteDir = fs.mkdtempSync(join(tmpdir(), 'dx-icons-'));
        spritePath = join(devSpriteDir, spriteFile);
        // A copy left in publicDir by a build or an older dev server would shadow the private one:
        // Storybook serves `staticDirs` ahead of every Vite middleware.
        fs.rmSync(publicSpritePath, { force: true });

        // Rebuild when a glyph already in the sprite is redrawn. The icon registry ingests the sprite
        // once per document, so the write alone changes nothing on screen — hence the full reload.
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

        // Serves the private sprite, complete. On a cold start the browser
        // requests it as soon as the first <Icon> paints — often before the
        // debounced write has flushed, or before the first write at all — which
        // yields blank icons until a hard reload, so a pending write is flushed
        // first and the served sprite reflects every symbol detected so far.
        // Read whole rather than streamed: a read error then falls through to `next()` instead of
        // surfacing as an unhandled stream error that would take the dev server down.
        const serveSprite: Connect.NextHandleFunction = (req, res, next) => {
          fs.readFile(spritePath, (err, data) => {
            if (err) {
              return next();
            }
            res.setHeader('Content-Type', 'image/svg+xml');
            res.setHeader('Content-Length', data.length);
            // The sprite grows as modules are served; a cached copy would hide icons found since.
            res.setHeader('Cache-Control', 'no-store');
            res.end(req.method === 'HEAD' ? undefined : data);
          });
        };
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url ?? '').split('?')[0];
          if (pathname !== `/${spriteFile}` || (req.method !== 'GET' && req.method !== 'HEAD')) {
            return next();
          }
          // An in-flight write may be mid-rewrite of the file, so wait for it as well as for a pending one.
          const pending = writeTimer || !fs.existsSync(spritePath) ? flushSprite() : flushing;
          if (pending) {
            void pending.then(
              () => serveSprite(req, res, next),
              () => next(),
            );
            return;
          }
          serveSprite(req, res, next);
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
                  noteScan(scan(fs.readFileSync(filename, 'utf8')));
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
        noteScan(scan(html));
      },

      transform: (src, id) => {
        if (!shouldIgnore(id)) {
          noteScan(scan(src));
        }
      },
    },
    {
      // Step 2: Write sprite.
      // NOTE: This must run before the public directory is copied.
      name: '@ch-ui/icons:write',
      // Force a final write at build close so production builds aren't
      // missing icons that were detected during the very last transforms.
      buildEnd: async () => {
        await flushSprite();
      },
      closeBundle: () => {
        if (devSpriteDir) {
          fs.rmSync(devSpriteDir, { recursive: true, force: true });
          devSpriteDir = null;
        }
      },
    },
    ...(assets ?? []).map(iconAssetsPlugin),
  ] satisfies Plugin[];
};
