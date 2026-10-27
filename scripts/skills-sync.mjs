#!/usr/bin/env node
//
// Copyright 2026 DXOS.org
//

// Compare the skills another repo installed from this one (`npx skills add dxos/dxos --skill <name>`)
// with their source here, and say what each needs: nothing, an update downstream, or a local edit
// taken upstream first.
//
// Usage (from this checkout, with the consumer checked out beside it):
//   node scripts/skills-sync.mjs --consumer ../edge [--ref origin/main] [--skill <name>] [--patch-dir <dir>] [--json]
//
// The consumer's `skills-lock.json` records each skill's content hash at install time (no commit), so:
//   local = hash of the consumer's installed folder, lock = recorded hash, upstream = hash at --ref.
//
//   local == lock == upstream   in-sync    nothing to do
//   local == lock != upstream   behind     update the consumer: `npx skills update <name> -p -y`
//   local != lock == upstream   edited     the consumer changed its copy: take the patch upstream
//   local != lock != upstream   diverged   both changed: take the patch upstream (3-way), then update
//
// `--patch-dir` writes `<name>.patch` for edited/diverged skills: the consumer's copy against the
// upstream commit it was installed from (found by hash), with repo-relative paths, so
// `git apply -3 <patch>` in this repo replays it onto the current source.
//
// Exit code: 0 when every skill is in sync, 1 when any needs action, 2 on a usage or git error.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    'consumer': { type: 'string' },
    'upstream': { type: 'string', default: resolve(dirname(fileURLToPath(import.meta.url)), '..') },
    'source': { type: 'string', default: 'dxos/dxos' },
    'ref': { type: 'string', default: 'origin/main' },
    'skill': { type: 'string', multiple: true },
    'patch-dir': { type: 'string' },
    'max-commits': { type: 'string', default: '500' },
    'json': { type: 'boolean', default: false },
  },
});

const fail = (message) => {
  console.error(`skills-sync: ${message}`);
  process.exit(2);
};

if (!values.consumer) {
  fail('--consumer <path to the repo that installed the skills> is required');
}
const consumer = resolve(values.consumer);
const upstream = resolve(values.upstream);
const lockPath = join(consumer, 'skills-lock.json');
if (!existsSync(lockPath)) {
  fail(`no skills-lock.json in ${consumer}`);
}

const git = (args, input) =>
  execFileSync('git', ['-C', upstream, ...args], { input, maxBuffer: 1 << 30, encoding: input ? undefined : 'utf8' });

/** Paths the `skills` CLI leaves out of a folder hash. */
const isHashed = (relativePath) =>
  !relativePath.split('/').some((segment) => segment === '.git' || segment === 'node_modules');

/** The `skills` CLI's folder hash (`computeSkillFolderHash`): sha256 over sorted path + content pairs. */
const hashFiles = (files) => {
  const hash = createHash('sha256');
  for (const file of [...files].sort((left, right) => left.relativePath.localeCompare(right.relativePath))) {
    hash.update(file.relativePath);
    hash.update(file.content);
  }
  return hash.digest('hex');
};

/** Regular files under a directory on disk; symlinks are skipped, as the CLI's walk does. */
const readDiskFiles = (root, current = root) =>
  readdirSync(current, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(current, entry.name);
    if (entry.isDirectory()) {
      return entry.name === '.git' || entry.name === 'node_modules' ? [] : readDiskFiles(root, fullPath);
    }
    return entry.isFile()
      ? [{ relativePath: relative(root, fullPath).split('\\').join('/'), content: readFileSync(fullPath) }]
      : [];
  });

/** Regular files of `dir` at a commit, read in one `git cat-file --batch` call. */
const readGitFiles = (commit, dir) => {
  const entries = git(['ls-tree', '-r', '-z', commit, '--', `${dir}/`])
    .split('\0')
    .filter(Boolean)
    .map((line) => {
      const [meta, path] = line.split('\t');
      const [mode, type, sha] = meta.split(' ');
      return { mode, type, sha, relativePath: path.slice(dir.length + 1) };
    })
    .filter((entry) => entry.type === 'blob' && entry.mode !== '120000' && isHashed(entry.relativePath));
  if (entries.length === 0) {
    return [];
  }
  const output = git(['cat-file', '--batch'], entries.map((entry) => entry.sha).join('\n') + '\n');
  let offset = 0;
  return entries.map((entry) => {
    const headerEnd = output.indexOf(0x0a, offset);
    const size = Number(output.subarray(offset, headerEnd).toString('utf8').split(' ')[2]);
    const content = output.subarray(headerEnd + 1, headerEnd + 1 + size);
    offset = headerEnd + 1 + size + 1;
    return { relativePath: entry.relativePath, content, executable: entry.mode === '100755' };
  });
};

/** Newest commit at or before `ref` whose copy of `dir` hashes to `hash`, or null. */
const findBase = (dir, hash) => {
  const commits = git(['log', '--format=%H', `--max-count=${values['max-commits']}`, values.ref, '--', dir])
    .split('\n')
    .filter(Boolean);
  return commits.find((commit) => hashFiles(readGitFiles(commit, dir)) === hash) ?? null;
};

const writeFiles = (root, files) => {
  for (const file of files) {
    const target = join(root, file.relativePath);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, file.content);
    // The patch carries file modes, so the base must keep git's executable bit to diff cleanly.
    chmodSync(target, file.executable ? 0o755 : 0o644);
  }
};

/** Patch from the base copy to the consumer's copy, with paths relative to this repo's root. */
const makePatch = (dir, baseFiles, installedDir) => {
  const scratch = mkdtempSync(join(tmpdir(), 'skills-sync-'));
  try {
    writeFiles(join(scratch, 'base', dir), baseFiles);
    mkdirSync(join(scratch, 'local', dir), { recursive: true });
    cpSync(installedDir, join(scratch, 'local', dir), { recursive: true });
    let diff;
    try {
      diff = execFileSync('git', ['diff', '--no-index', '--binary', 'base', 'local'], {
        cwd: scratch,
        encoding: 'utf8',
      });
    } catch (error) {
      // `git diff --no-index` exits 1 when the trees differ, which is the expected case here.
      if (error.status !== 1) {
        throw error;
      }
      diff = error.stdout;
    }
    // An added or deleted file names the existing side's root on both sides of its header.
    return diff.replace(/ ([ab])\/(?:base|local)\//g, ' $1/');
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
};

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
try {
  git(['rev-parse', '--verify', '--quiet', `${values.ref}^{commit}`]);
} catch {
  fail(`${values.ref} is not a commit in ${upstream}; fetch it first`);
}

const results = Object.entries(lock.skills)
  .filter(([name, entry]) => entry.source === values.source && (!values.skill || values.skill.includes(name)))
  .map(([name, entry]) => {
    const dir = dirname(entry.skillPath ?? '');
    const installedDir = join(consumer, '.agents', 'skills', name);
    if (!entry.skillPath) {
      return { name, state: 'no-skill-path', action: `reinstall: npx skills add ${values.source} --skill ${name}` };
    }
    if (!existsSync(installedDir)) {
      return { name, dir, state: 'missing', action: `reinstall: npx skills add ${values.source} --skill ${name}` };
    }
    const local = hashFiles(readDiskFiles(installedDir));
    const upstreamHash = hashFiles(readGitFiles(values.ref, dir));
    const edited = local !== entry.computedHash;
    const moved = upstreamHash !== entry.computedHash;
    const state = edited ? (moved ? 'diverged' : 'edited') : moved ? 'behind' : 'in-sync';
    const result = { name, dir, state, local, lock: entry.computedHash, upstream: upstreamHash };
    if (state !== 'in-sync') {
      result.base = findBase(dir, entry.computedHash);
    }
    if (state === 'behind') {
      result.action = `in ${consumer}: npx skills update ${name} -p -y`;
    }
    if (edited) {
      const base = result.base;
      result.action = base
        ? `take the consumer's edit upstream (git apply -3), land it, then update the consumer`
        : `the installed hash matches no upstream commit in the last ${values['max-commits']} (a shallow clone hides older ones: git fetch --unshallow); the patch is against ${values.ref}`;
      if (values['patch-dir']) {
        const baseFiles = readGitFiles(base ?? values.ref, dir);
        mkdirSync(values['patch-dir'], { recursive: true });
        result.patch = resolve(values['patch-dir'], `${name}.patch`);
        writeFileSync(result.patch, makePatch(dir, baseFiles, installedDir));
      }
    }
    return result;
  });

if (values.json) {
  console.log(JSON.stringify(results, null, 2));
} else {
  for (const result of results) {
    console.log(`${result.name.padEnd(24)} ${result.state.padEnd(10)} ${result.action ?? ''}`);
    if (result.base) {
      console.log(`${''.padEnd(35)} installed from ${result.base}`);
    }
    if (result.patch) {
      console.log(`${''.padEnd(35)} patch: ${result.patch}`);
    }
  }
  if (results.length === 0) {
    console.log(`no skills from ${values.source} in ${lockPath}`);
  }
}
process.exit(results.every((result) => result.state === 'in-sync') ? 0 : 1);
