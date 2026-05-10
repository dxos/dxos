#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Downloads the `dxos-introspect-cache` artifact built by the
// `Introspect Cache` GitHub workflow on the most recent successful commit to
// main, and installs it at `<repo-root>/node_modules/.cache/dxos-introspect/cache.json`.
//
// Run from the worktree root:
//   moon run introspect-mcp:fetch-cache
//
// The MCP server (and any other consumer of @dxos/introspect) will pick up
// the prebuilt cache automatically on next start. Per-package validity is
// determined by git tree SHA — entries whose tree SHA matches your current
// HEAD survive. Anything that drifted since the CI run gets re-extracted on
// demand. A clean checkout at a recent main commit typically yields ~95%
// reuse.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const findRepoRoot = (start) => {
  let cursor = start;
  while (true) {
    if (existsSync(join(cursor, 'pnpm-workspace.yaml'))) {
      return cursor;
    }
    const parent = dirname(cursor);
    if (parent === cursor) {
      throw new Error('Could not find repo root (no pnpm-workspace.yaml in any parent of ' + start + ')');
    }
    cursor = parent;
  }
};

const REPO_ROOT = findRepoRoot(__dirname);
const CACHE_DEST = join(REPO_ROOT, 'node_modules/.cache/dxos-introspect/cache.json');
const ARTIFACT_NAME = 'dxos-introspect-cache';
const REPO = 'dxos/dxos';
const WORKFLOW = 'introspect-cache.yml';

const log = (msg) => process.stderr.write(`[fetch-cache] ${msg}\n`);

const run = (cmd, args, opts = {}) => {
  const result = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  if (result.status !== 0) {
    const stderr = result.stderr || '';
    const stdout = result.stdout || '';
    throw new Error(`${cmd} ${args.join(' ')} failed (exit ${result.status})\n${stderr}${stdout}`);
  }
  return result.stdout;
};

const ensureGhAvailable = () => {
  const result = spawnSync('gh', ['--version'], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(
      'GitHub CLI (`gh`) is not installed or not on PATH. Install it from https://cli.github.com/ and run `gh auth login`.',
    );
  }
};

const findLatestSuccessfulRun = () => {
  log(`Looking up most recent successful "${WORKFLOW}" run on main…`);
  // `gh run list` returns the newest first; --status=success filters to runs
  // that finished green.
  const stdout = run('gh', [
    'run',
    'list',
    '--repo',
    REPO,
    '--workflow',
    WORKFLOW,
    '--branch',
    'main',
    '--status',
    'success',
    '--limit',
    '1',
    '--json',
    'databaseId,headSha,createdAt',
  ]);
  const runs = JSON.parse(stdout);
  if (!runs.length) {
    throw new Error(
      `No successful "${WORKFLOW}" run found on main. Either the workflow has not yet run successfully, or you're authed against the wrong account.`,
    );
  }
  return runs[0];
};

const main = async () => {
  ensureGhAvailable();
  const latest = findLatestSuccessfulRun();
  log(`Found run #${latest.databaseId} (commit ${latest.headSha.slice(0, 12)}, ${latest.createdAt}).`);

  // `gh run download` extracts the artifact into a directory named after it
  // (so the cache.json lands at <tmp>/dxos-introspect-cache/cache.json). Use a
  // dedicated tmp dir under node_modules/.cache so we don't pollute the repo
  // root and so a partial download is easy to discard.
  const tmpDir = join(REPO_ROOT, 'node_modules/.cache/dxos-introspect-fetch');
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  mkdirSync(tmpDir, { recursive: true });

  log(`Downloading "${ARTIFACT_NAME}" into ${tmpDir}…`);
  run('gh', ['run', 'download', String(latest.databaseId), '--repo', REPO, '--name', ARTIFACT_NAME, '--dir', tmpDir]);

  // Locate the downloaded file. The artifact contains exactly one file
  // (cache.json), but `gh run download --name` extracts directly into the
  // dir, so the file should be at `<tmpDir>/cache.json`.
  const downloaded = (() => {
    const direct = join(tmpDir, 'cache.json');
    if (existsSync(direct)) {
      return direct;
    }
    // Fallback: walk one level deep in case `gh` decides to nest.
    for (const entry of readdirSync(tmpDir)) {
      const candidate = join(tmpDir, entry);
      if (statSync(candidate).isFile() && entry.endsWith('.json')) {
        return candidate;
      }
    }
    throw new Error(`Could not find cache.json in ${tmpDir}`);
  })();

  // Atomic install — rename only after the download succeeded so we never
  // leave the destination half-written. Same convention as introspect's own
  // saveCache.
  mkdirSync(dirname(CACHE_DEST), { recursive: true });
  renameSync(downloaded, CACHE_DEST);
  rmSync(tmpDir, { recursive: true, force: true });

  const sizeKb = Math.round(statSync(CACHE_DEST).size / 1024);
  log(`Installed cache at ${CACHE_DEST} (${sizeKb} KB).`);
  log('Next MCP server start will reuse this cache for any package whose tree SHA matches HEAD.');
};

main().catch((err) => {
  process.stderr.write(`[fetch-cache] failed: ${err.message ?? err}\n`);
  process.exit(1);
});
