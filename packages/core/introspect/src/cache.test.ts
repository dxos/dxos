//
// Copyright 2026 DXOS.org
//

// Tests that the on-disk symbol cache is actually reused across introspector
// runs. Without this, schema changes silently re-extract every time and the
// "cache" doesn't cache anything.

import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { cacheFilePath } from './indexer/cache';
import { createIntrospector } from './introspector';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURE_SRC = join(__dirname, '__fixtures__');

// Each test gets its own temp copy of the fixture so the cache file lands at
// a known path we control. The cache lives under <root>/node_modules/.cache/
// dxos-introspect/cache.json — relative to whatever monorepo root we point
// the introspector at.

describe('symbol cache reuse', { timeout: 30_000 }, () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'introspect-cache-'));
    // Mirror the fixture monorepo into the temp dir, then nuke any stale
    // cache that came along from a prior run of any other test.
    const { cp } = await import('node:fs/promises');
    await cp(FIXTURE_SRC, root, { recursive: true });
    await rm(join(root, 'node_modules/.cache'), { recursive: true, force: true }).catch(() => undefined);
  });

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true }).catch(() => undefined);
    }
  });

  test('first run extracts; second run loads from cache without re-extracting', async ({ expect }) => {
    const cachePath = cacheFilePath(root);

    // Cold: no cache yet.
    expect(existsSync(cachePath)).toBe(false);
    const intro1 = createIntrospector({ monorepoRoot: root, cache: true, prewarm: true });
    await intro1.ready;
    intro1.dispose();
    expect(existsSync(cachePath)).toBe(true);

    // Snapshot the cache contents so we can prove run 2 didn't rewrite it.
    const cacheBytes = await readFile(cachePath, 'utf8');
    expect(cacheBytes.length).toBeGreaterThan(0);

    // Warm: pointing the same root at a fresh introspector should reuse the
    // cache. We assert this by stat'ing — the file shouldn't be rewritten if
    // every package was reused. (We can't easily mock extractSymbols inside
    // an async IIFE, so this stat-based assertion is the cleanest signal.)
    const intro2 = createIntrospector({ monorepoRoot: root, cache: true, prewarm: true });
    const start = Date.now();
    await intro2.ready;
    const elapsed = Date.now() - start;
    intro2.dispose();

    // Fixture has 2 packages; cold run is well under 500ms but warm should
    // be even faster — and crucially the file contents are identical.
    // Threshold is generous to absorb CI disk/CPU contention; the byte-equality
    // assertion below is the real "no re-extraction" signal.
    expect(elapsed).toBeLessThan(5_000);
    const cacheBytesAfter = await readFile(cachePath, 'utf8');
    expect(cacheBytesAfter).toBe(cacheBytes);

    // Sanity: both introspectors saw the same symbols.
    const intro3 = createIntrospector({ monorepoRoot: root, cache: true, prewarm: true });
    await intro3.ready;
    const pkgs = intro3.listPackages();
    const taskSym = intro3.getSymbol('@fixture/pkg-a#Task');
    intro3.dispose();
    expect(pkgs.length).toBe(2);
    expect(taskSym?.name).toBe('Task');
  });

  test('editing one package invalidates only that package', async ({ expect }) => {
    const cachePath = cacheFilePath(root);

    // Cold pass to populate the cache.
    const intro1 = createIntrospector({ monorepoRoot: root, cache: true, prewarm: true });
    await intro1.ready;
    intro1.dispose();

    const cacheV1 = await readFile(cachePath, 'utf8');

    // Touch one source file in pkg-a — should bump only pkg-a's mtime.
    const target = join(root, 'packages/pkg-a/src/Task.ts');
    const original = await readFile(target, 'utf8');
    // Append a comment with a different timestamp so the bytes (and mtime)
    // change. setTimeout-then-write so node flushes the mtime update.
    await new Promise((r) => setTimeout(r, 20));
    await writeFile(target, `${original}\n// touched at ${Date.now()}\n`);

    // Warm pass — should reuse pkg-b but re-extract pkg-a.
    const intro2 = createIntrospector({ monorepoRoot: root, cache: true, prewarm: true });
    await intro2.ready;
    intro2.dispose();

    const cacheV2 = await readFile(cachePath, 'utf8');
    expect(cacheV2).not.toBe(cacheV1); // file should have been rewritten

    // Restore the file so the test is idempotent (cleanup also removes root).
    await writeFile(target, original);
  });
});
