#!/usr/bin/env bun
//
// Copyright 2026 DXOS.org
//

// A prebuilt spec-viewer storybook in the `agent-artifacts` R2 bucket, so sharing a spec needs no storybook build.
//
//   storybook-cache.ts push <build dir> [--ref main]      # upload a build of the current commit
//   storybook-cache.ts pull <out dir> [--ref main]        # download the newest build for a ref
//
// A build holds code only: `package.py --spec` ships the specs beside the page, so a cached build renders any spec
// written after it. `pull` lists the viewer code changed since the cached commit; rebuild only when that matters.
// Credentials are those of `hosting-artifacts/scripts/upload-artifact.mjs`, which does the upload.

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const UPLOAD = join(ROOT, '.agents/skills/hosting-artifacts/scripts/upload-artifact.mjs');
const PUBLIC_BASE = process.env.R2_PUBLIC_BASE || 'https://pub-39066a86073446d7b77b1c157b660bb5.r2.dev';
const PREFIX = 'storybook/specs';

// What the build bundles: a change elsewhere (a spec, a skill, a workflow) cannot change what the viewer renders.
const VIEWER_INPUTS = ['packages/', 'tools/storybook-react/', 'pnpm-lock.yaml'];
const NOT_VIEWER_INPUT = /\.(mdl|md)$|\.test\.tsx?$|\/playwright\//;

const fail = (message: string): never => {
  console.error(message);
  process.exit(1);
};

const git = (...args: string[]): string => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim();

const refKey = (ref: string): string => `${PREFIX}/refs/${ref.replace(/[^A-Za-z0-9._-]/g, '--')}.json`;

const changedViewerFiles = (commit: string): string[] =>
  [...new Set([...git('diff', '--name-only', commit, 'HEAD').split('\n'), ...git('diff', '--name-only').split('\n')])]
    .filter(Boolean)
    .filter((file) => VIEWER_INPUTS.some((input) => file.startsWith(input)) && !NOT_VIEWER_INPUT.test(file));

const upload = (file: string, key: string): void =>
  void execFileSync('node', [UPLOAD, file, '--key', key], { stdio: 'inherit' });

const push = (build: string, ref: string): void => {
  const commit = git('rev-parse', 'HEAD');
  const dirty = git('status', '--porcelain', '--', ...VIEWER_INPUTS)
    .split('\n')
    .filter((line) => line && !NOT_VIEWER_INPUT.test(line));
  // A cached build is named by its commit, so it must be exactly that commit's viewer code.
  if (dirty.length > 0 && !process.argv.includes('--allow-dirty')) {
    fail(`viewer code has uncommitted changes; commit them or pass --allow-dirty:\n  ${dirty.join('\n  ')}`);
  }
  const scratch = mkdtempSync(join(tmpdir(), 'storybook-cache-'));
  try {
    const archive = join(scratch, `${commit}.tar.gz`);
    execFileSync('tar', ['-czf', archive, '-C', resolve(build), '.']);
    const buildKey = `${PREFIX}/builds/${commit}.tar.gz`;
    upload(archive, buildKey);
    const pointer = join(scratch, 'pointer.json');
    writeFileSync(
      pointer,
      JSON.stringify({
        commit,
        ref,
        key: buildKey,
        url: `${PUBLIC_BASE}/${buildKey}`,
        builtAt: new Date().toISOString(),
      }),
    );
    upload(pointer, refKey(ref));
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

type Pointer = { commit: string; url: string; builtAt: string };

const pull = async (out: string, ref: string): Promise<void> => {
  // The pointer is overwritten in place, so the query keeps an intermediate cache from serving an old one.
  const response = await fetch(`${PUBLIC_BASE}/${refKey(ref)}?t=${Date.now()}`);
  if (!response.ok) {
    fail(`no cached build for ${ref} (${response.status}); build one (sharing-specs §3) and push it`);
  }
  const { commit, url, builtAt }: Pointer = await response.json();
  const archive = await fetch(url);
  if (!archive.ok) {
    fail(`${url}: ${archive.status}`);
  }
  const scratch = mkdtempSync(join(tmpdir(), 'storybook-cache-'));
  try {
    const file = join(scratch, 'build.tar.gz');
    writeFileSync(file, Buffer.from(await archive.arrayBuffer()));
    rmSync(out, { recursive: true, force: true });
    mkdirSync(out, { recursive: true });
    execFileSync('tar', ['-xzf', file, '-C', out]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  console.log(`${out}: build of ${commit.slice(0, 10)} (${ref}, ${builtAt})`);

  try {
    git('cat-file', '-e', `${commit}^{commit}`);
  } catch {
    try {
      git('fetch', '--quiet', '--depth=1', 'origin', commit);
    } catch {
      console.log(`cannot fetch ${commit} to compare; rebuild if this branch changes the viewer`);
      return;
    }
  }
  const changed = changedViewerFiles(commit);
  if (changed.length === 0) {
    console.log('no viewer code changed since that build: use it');
  } else {
    console.log(`${changed.length} viewer file(s) changed since that build; rebuild only if the page must show them:`);
    for (const file of changed.slice(0, 20)) {
      console.log(`  ${file}`);
    }
  }
};

const [command, dir] = process.argv.slice(2);
const refIndex = process.argv.indexOf('--ref');
const ref = refIndex > 0 ? process.argv[refIndex + 1] : 'main';
if (!dir || !['push', 'pull'].includes(command)) {
  fail('usage: storybook-cache.ts push <build dir> [--ref main] [--allow-dirty] | pull <out dir> [--ref main]');
}
if (command === 'push') {
  push(dir, ref);
} else {
  await pull(dir, ref);
}
