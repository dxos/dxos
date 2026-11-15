#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Mirrors the whitelisted brand asset folders into the public `assets` R2 bucket under `brand/`, so a deck,
// a README, a third-party site or a plugin can hot-link a mark at a stable URL instead of committing its own
// copy: `packages/ui/brand/assets/icons/echo.svg` is served at `https://assets.dxos.org/brand/icons/echo.svg`.
//
// Only three folders are published, and within them only servable raster/vector images. Everything else in
// the package stays private: `fonts` and `sounds` are licensed, `rive` and `social` are working files, and
// `icons` holds a README and an Affinity Designer source next to the exported SVGs.
//
// Adds and overwrites; never deletes. The bucket is public and keyed by a path a third party may already have
// hot-linked, so a delete pass is the one irreversible mistake available here — a renamed or removed source
// file leaves its object behind until someone removes it by hand.
//
// Each object carries a short Cache-Control: paths are stable and overwritten in place, so without one the
// edge pins the bytes of a mark that has since been redrawn.
//
// Signing, per-extension content types and post-upload verification through the public domain all come from
// the hosting-artifacts uploader (as `storybook-cache.ts` does); this script only decides what to publish and
// under which key.
//
// Publishes whatever the running checkout holds, so a run from a branch that is behind on these files
// silently reverts the bucket to the older art. `main` is the only ref the workflow runs on, and a run
// anywhere else needs `--force` for that reason — reach for `--dry-run` first.
//
// Usage: sync-brand-assets.mjs [--dry-run] [--force]

import { execFile } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const UPLOAD = join(ROOT, '.agents/skills/hosting-artifacts/scripts/upload-artifact.mjs');
const SOURCE = join(ROOT, 'packages/ui/brand/assets');

const BUCKET = 'assets';
const PUBLIC_BASE = 'https://assets.dxos.org';
const PREFIX = 'brand';

// Named one by one rather than discovered: a folder added to the package later must be published on purpose,
// not by a workflow that notices it.
const FOLDERS = ['backgrounds', 'icons', 'logotypes'];

// A browser renders these; anything else would download, so publishing it only invites a dead hot-link.
const PUBLISHED = new Set(['.svg', '.png', '.jpg', '.jpeg']);

// Stable paths overwritten in place: five minutes at the edge, a day of serving the old bytes while the new
// ones are fetched behind it.
const CACHE_CONTROL = 'public, max-age=300, stale-while-revalidate=86400';

/** Bounded because each upload is a process, and the fan-out is otherwise one per file. */
const CONCURRENCY = 8;

const run = promisify(execFile);

/** Every file under `dir`, recursively, relative to SOURCE and in posix form (the key separator). */
const walk = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory() ? walk(path) : [relative(SOURCE, path).split(/[\\/]/).join(posix.sep)];
    }),
  );
  return files.flat().sort();
};

const main = async () => {
  const dryRun = process.argv.includes('--dry-run');

  // Overwrites in place, over a public URL a third party may already serve. Outside CI that is a
  // production write from whatever the checkout happens to hold, which is worth one deliberate flag.
  if (!dryRun && !process.env.CI && !process.argv.includes('--force')) {
    console.error(
      `refusing to publish to ${PUBLIC_BASE}/${PREFIX}/ outside CI: this overwrites live objects with\n` +
        "this checkout's copies, reverting anything published from a newer commit. Pass --dry-run to see\n" +
        'what would be uploaded, or --force if overwriting is what you mean.',
    );
    process.exit(1);
  }

  const candidates = (await Promise.all(FOLDERS.map((folder) => walk(join(SOURCE, folder))))).flat();
  const published = candidates.filter((file) => PUBLISHED.has(`.${file.split('.').pop()}`.toLowerCase()));
  const skipped = candidates.filter((file) => !published.includes(file));

  for (const file of skipped) {
    console.log(`skip  ${file}`);
  }

  if (dryRun) {
    for (const file of published) {
      console.log(`would upload  ${PREFIX}/${file}`);
    }
    console.log(`\n${published.length} to upload, ${skipped.length} skipped (dry run)`);
    return;
  }

  // The uploader verifies each object through the public domain after the PUT — status, content type,
  // cache-control and the served body against the local md5 — so a green run has already been checked.
  const env = { ...process.env, R2_BUCKET: BUCKET, R2_PUBLIC_BASE: PUBLIC_BASE };
  let next = 0;
  let failed;

  const worker = async () => {
    while (!failed && next < published.length) {
      const file = published[next++];
      const key = `${PREFIX}/${file}`;
      try {
        await run('node', [UPLOAD, join(SOURCE, file), '--key', key, '--cache-control', CACHE_CONTROL], { env });
        console.log(`ok    ${PUBLIC_BASE}/${key}`);
      } catch (error) {
        failed ??= new Error(`failed to upload ${key}:\n${error?.stderr || error?.message || error}`);
      }
    }
  };

  const started = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  if (failed) {
    console.error(failed.message);
    process.exit(1);
  }

  console.log(
    `\n${published.length} uploaded, ${skipped.length} skipped in ${Math.round((Date.now() - started) / 1000)}s` +
      ` → ${PUBLIC_BASE}/${PREFIX}/`,
  );
};

await main();
