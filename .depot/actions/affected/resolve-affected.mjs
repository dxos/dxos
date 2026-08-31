#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

// moon's own `--affected remote` diffs against whatever `vcs.defaultBranch` resolves to, which is the
// right base only for a topic-branch PR.
//
// Falling back to a FULL run whenever a base cannot be resolved: moon exits 0 having run nothing when
// the affected set comes back empty, so a base that silently fails to resolve turns every gate in the
// workflow green.

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

const USAGE = `Resolve the moon affected scope for a CI trigger.

Usage: node .depot/actions/affected/resolve-affected.mjs [options]

  --event <name>  Resolve as if this trigger fired. Default: $GITHUB_EVENT_NAME, else a local run.
  --base <ref>    Compare against this revision instead of the trigger's own base.
  --head <ref>    Compare up to this revision instead of the working tree.
  --all           Force a full run.
  --shell         Print \`export KEY=value\` lines, for eval.
  --help          Print this.

Writes KEY=value to stdout and appends it to $GITHUB_ENV when set; a full run writes nothing at all.
Everything else goes to stderr, so --shell output stays evaluable.`;

const DEFAULT_BRANCH_PATTERN = /^\s*defaultBranch:\s*['"]?([^'"\s#]+)/m;

const FULL_RUN = Symbol('full run');

const main = () => {
  const args = parseArgs(process.argv.slice(2));
  const defaultBranch = readDefaultBranch();
  const event = args.event ?? process.env.GITHUB_EVENT_NAME ?? 'local';
  const branch = readBranch();

  const { base, reason } = resolve({ args, event, branch, defaultBranch });
  if (base === FULL_RUN) {
    note(`Full run — ${reason}. Leaving MOON_AFFECTED unset.`);
    return;
  }

  const head = args.head ?? 'HEAD';
  // Export the fork point rather than the raw base: moon merge-bases a resolvable base with HEAD
  // itself (2.5.2), so this is behaviour-neutral, and the logged range is the range moon diffs even
  // when the base branch has advanced past the fork.
  const fork = tryGit('merge-base', base, head) ?? base;
  const range = args.head ? [fork, args.head] : [fork];
  const changed =
    tryGit('diff', '--name-only', ...range)
      ?.split('\n')
      .filter(Boolean) ?? [];
  note(`Affected run — ${reason} (${fork.slice(0, 8)}..${head}, ${changed.length} changed files).`);

  emit(args, { MOON_AFFECTED: 'remote', MOON_BASE: fork, ...(args.head ? { MOON_HEAD: args.head } : {}) });
};

const resolve = ({ args, event, branch, defaultBranch }) => {
  if (args.all || process.env.CI_AFFECTED_ALL === 'true') {
    return { base: FULL_RUN, reason: 'requested explicitly' };
  }
  if (args.base) {
    return fromRevision(args.base, 'base passed on the command line');
  }

  const payload = readEvent();
  switch (event) {
    case 'pull_request':
    case 'pull_request_target':
      return fromRevision(payload.pull_request?.base?.sha, `${event} base branch`, defaultBranch);

    case 'merge_group':
      return fromRevision(payload.merge_group?.base_sha, 'merge queue base', defaultBranch);

    case 'schedule':
      return { base: FULL_RUN, reason: 'scheduled run' };

    default:
      if (branch === defaultBranch) {
        return { base: FULL_RUN, reason: `${event} on ${defaultBranch}` };
      }
      return fromMergeBase(defaultBranch, `${event} on ${branch ?? 'a detached HEAD'}`);
  }
};

const fromRevision = (revision, reason, defaultBranch) => {
  const resolved = resolveCommit(revision);
  if (resolved) {
    return { base: resolved, reason };
  }
  if (!defaultBranch) {
    return { base: FULL_RUN, reason: `${reason} (${revision ?? 'absent'}) does not resolve` };
  }
  note(`${reason} (${revision ?? 'absent'}) does not resolve here — falling back to the merge-base.`);
  return fromMergeBase(defaultBranch, reason);
};

const fromMergeBase = (defaultBranch, reason) => {
  // `origin/` first: a checkout's local `main` is whatever the clone left behind, and in a worktree it
  // is routinely stale.
  for (const ref of [`origin/${defaultBranch}`, defaultBranch]) {
    const resolved = resolveCommit(ref);
    const base = resolved && tryGit('merge-base', resolved, 'HEAD');
    if (base) {
      return { base, reason: `${reason}, merge-base with ${ref}` };
    }
  }
  return { base: FULL_RUN, reason: `${reason}, but ${defaultBranch} is not reachable from this checkout` };
};

const parseArgs = (argv) => {
  if (argv.includes('--help')) {
    console.log(USAGE);
    process.exit(0);
  }
  const args = { all: false, shell: false };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    const value = () => argv[++index] ?? fail(`${arg} needs a value`);
    switch (arg) {
      case '--all':
        args.all = true;
        break;
      case '--shell':
        args.shell = true;
        break;
      case '--event':
        args.event = value();
        break;
      case '--base':
        args.base = value();
        break;
      case '--head':
        args.head = value();
        break;
      default:
        fail(`unknown argument ${arg}`);
    }
  }
  return args;
};

const readDefaultBranch = () => {
  const config = existsSync('.moon/workspace.yml') ? readFileSync('.moon/workspace.yml', 'utf8') : '';
  return DEFAULT_BRANCH_PATTERN.exec(config)?.[1] ?? 'main';
};

const readBranch = () => {
  // GITHUB_HEAD_REF is the source branch and is set only on pull_request events; GITHUB_REF is the
  // queue/tag/branch ref everywhere else. Neither exists for a local run.
  const ref = process.env.GITHUB_REF;
  return (
    process.env.GITHUB_HEAD_REF ||
    (ref?.startsWith('refs/heads/') ? ref.slice('refs/heads/'.length) : undefined) ||
    tryGit('branch', '--show-current') ||
    undefined
  );
};

const readEvent = () => {
  const path = process.env.GITHUB_EVENT_PATH;
  if (!path || !existsSync(path)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    note(`Could not parse ${path} — treating the event payload as empty.`);
    return {};
  }
};

const emit = (args, vars) => {
  const lines = Object.entries(vars).map(([key, value]) => `${key}=${value}`);
  for (const line of lines) {
    console.log(args.shell ? `export ${line}` : line);
  }
  if (process.env.GITHUB_ENV) {
    appendFileSync(process.env.GITHUB_ENV, `${lines.join('\n')}\n`);
  }
};

const resolveCommit = (revision) =>
  revision ? tryGit('rev-parse', '--verify', '--quiet', `${revision}^{commit}`) : undefined;

const tryGit = (...args) => {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || undefined;
  } catch {
    return undefined;
  }
};

const note = (message) => console.error(`affected: ${message}`);

const fail = (message) => {
  note(message);
  console.error(USAGE);
  process.exit(1);
};

main();
