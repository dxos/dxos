#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// When building composer-crx inside a git worktree (e.g.,
// `.claude/worktrees/<branch>/packages/apps/composer-crx/dist`), mirror the
// bundle into the main repo's tree at
// `<repo-root>/packages/apps/composer-crx/dist` so Chrome's "Load unpacked"
// pointed at the stable main-repo path picks up the latest build without
// manual copying.
//
// No-op when run from the main checkout (source === target).

import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const source = join(pkgRoot, 'dist');

/**
 * Locate the main repo for a given worktree package path.
 *
 * DXOS convention: worktrees live under `<repo>/.claude/worktrees/<name>/`.
 * So given `<repo>/.claude/worktrees/<name>/packages/apps/composer-crx`, the
 * main repo is the portion before `.claude/worktrees/`. Returns `undefined`
 * when we are not inside a worktree.
 */
const findMainRepo = (from) => {
  const marker = `${'.claude'}/worktrees/`;
  const idx = from.indexOf(`/${marker}`);
  if (idx === -1) {
    return undefined;
  }
  return from.slice(0, idx);
};

const copyRecursive = (src, dst) => {
  const stats = statSync(src);
  if (stats.isDirectory()) {
    mkdirSync(dst, { recursive: true });
    for (const entry of readdirSync(src)) {
      copyRecursive(join(src, entry), join(dst, entry));
    }
  } else {
    copyFileSync(src, dst);
  }
};

const main = () => {
  if (!existsSync(source)) {
    console.error(`sync-dist: source does not exist: ${source}`);
    console.error('  Run `moon run composer-crx:bundle` first.');
    process.exit(1);
  }

  const mainRepo = findMainRepo(pkgRoot);
  if (!mainRepo) {
    console.log('sync-dist: not in a worktree, nothing to do.');
    return;
  }

  const target = join(mainRepo, 'packages/apps/composer-crx/dist');
  if (target === source) {
    console.log('sync-dist: source === target, nothing to do.');
    return;
  }

  console.log(`sync-dist: ${relative(process.cwd(), source) || source}`);
  console.log(`        -> ${target}`);

  if (existsSync(target)) {
    rmSync(target, { recursive: true, force: true });
  }
  copyRecursive(source, target);
  console.log('sync-dist: done.');
};

main();
