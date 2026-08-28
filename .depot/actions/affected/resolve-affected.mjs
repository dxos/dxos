#!/usr/bin/env node

//
// Copyright 2026 DXOS.org
//

// Resolve one CI run's affected scope and export it as moon environment variables, so every moon
// invocation in the job is a single unconditional command line.
//
// `--affected remote` at each call site diffs against whatever `vcs.defaultBranch` resolves to, which
// is the right base only for a topic-branch PR. Every other trigger carries its own exact base in the
// event payload, and a local `depot ci run` carries no event at all — which is why the workflow used to
// approximate all of them with `branch != 'main'` and carry an Affected and an All variant of every
// step. Resolving once per job collapses those pairs and makes the same decision reproducible outside
// CI: with no `GITHUB_*` in the environment this falls back to the merge-base with the default branch,
// so `depot ci run`, `act` and a bare shell all compute what the real trigger would.
//
// Falling back to a FULL run whenever a base cannot be resolved is deliberate. moon exits 0 having run
// nothing when the affected set comes back empty, so a base that silently fails to resolve turns every
// gate in the workflow green — the same silent-degradation class the remote cache has
// (`.agents/projects/ci/DESIGN.md`, "The failure mode that governs every decision here").
//
// Lives beside the action that calls it rather than in `scripts/`, the same way
// `.depot/actions/test-report` keeps its shell script: nothing else invokes it, so deleting the action
// should delete this too.
//
// Usage — `A=.depot/actions/affected/resolve-affected.mjs`:
//   node $A                      # resolve for the current context
//   node $A --event merge_group  # emulate another trigger
//   node $A --base <ref>         # pin the base explicitly
//   node $A --all                # force a full run
//   eval "$(node $A --shell)"    # apply to the current shell
//
// Writes `KEY=value` lines to stdout, appends them to `$GITHUB_ENV` when set, and explains itself on
// stderr — so `--shell` output stays evaluable.

import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync } from 'node:fs';

// Read rather than imported from `yaml`: this has to run before `pnpm install` and from outside the
// workspace, so it stays on node builtins. `defaultBranch` appears once in the file.
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
  // Counting the diff proves the base is usable rather than merely resolvable, and separates "this PR
  // touches nothing moon owns" from "the comparison silently found nothing" in the job log. Two dots
  // from the merge-base rather than three from `base`, so the count includes the working tree — which
  // is what moon's `remote` scope compares, and the whole point of the local case.
  const fork = tryGit('merge-base', base, head) ?? base;
  const changed = tryGit('diff', '--name-only', fork)?.split('\n').filter(Boolean) ?? [];
  note(`Affected run — ${reason} (${base.slice(0, 8)}..${head}, ${changed.length} changed files).`);

  emit(args, { MOON_AFFECTED: 'remote', MOON_BASE: base, ...(args.head ? { MOON_HEAD: args.head } : {}) });
};

/**
 * Map a trigger to the base commit its affected set should be computed against, or `FULL_RUN`.
 */
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
      return fromRevision(payload.pull_request?.base?.sha, `${event} base branch`, branch, defaultBranch);

    case 'merge_group':
      return fromRevision(payload.merge_group?.base_sha, 'merge queue base', branch, defaultBranch);

    // A scheduled run is the nightly full sweep, and a push to the default branch is what every
    // affected comparison is measured against — neither has a meaningful base of its own.
    case 'schedule':
      return { base: FULL_RUN, reason: 'scheduled run' };

    default:
      if (branch === defaultBranch) {
        return { base: FULL_RUN, reason: `${event} on ${defaultBranch}` };
      }
      // Deliberately NOT `push.before`, which is the branch's previous tip: a follow-up push would then
      // test only its own commit and skip everything the branch changed before it.
      return fromMergeBase(branch, defaultBranch, `${event} on ${branch ?? 'a detached HEAD'}`);
  }
};

/**
 * Use `revision` when git can resolve it, else fall back to the merge-base, else to a full run.
 */
const fromRevision = (revision, reason, branch, defaultBranch) => {
  const resolved = resolveCommit(revision);
  if (resolved) {
    return { base: resolved, reason };
  }
  if (!defaultBranch) {
    return { base: FULL_RUN, reason: `${reason} (${revision ?? 'absent'}) does not resolve` };
  }
  note(`${reason} (${revision ?? 'absent'}) does not resolve here — falling back to the merge-base.`);
  return fromMergeBase(branch, defaultBranch, reason);
};

const fromMergeBase = (branch, defaultBranch, reason) => {
  // `origin/` first: a checkout's local `main` is whatever the clone happened to leave behind, and in a
  // worktree it is routinely stale by hundreds of commits.
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
  process.exit(1);
};

main();
