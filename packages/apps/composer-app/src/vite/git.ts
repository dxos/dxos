//
// Copyright 2026 DXOS.org
//

import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const run = promisify(execFile);

/** Bounds every git call so a hung repository (a lock, a network credential prompt) cannot stall the dev server. */
const TIMEOUT = 5_000;

/** Bounds what one git call may print, so a huge blob cannot exhaust the dev server's memory. */
const MAX_BUFFER = 16 * 1024 * 1024;

/** What `git show` prints when the path is not in the commit. */
const MISSING_PATH = /does not exist in|exists on disk, but not in/;

/** How long a pull-request lookup is reused; it costs a `gh` call or a GitHub API request. */
const PR_TTL = 5 * 60_000;

/** Branches whose pull-request lookup is remembered; bounds the cache when a long-lived server sees many checkouts. */
const MAX_PULL_REQUEST_LOOKUPS = 64;

/** The open pull request a branch heads. */
export type GitPullRequest = { number: number; url: string; title: string; base: string };

/** Where a checkout stands against the branch it will merge into; must match `GitStatus` in `@dxos/plugin-file-system/FileSystem`. */
export type GitStatus = {
  /** Current branch; absent on a detached HEAD. */
  branch?: string;
  /** Commit HEAD points at. */
  head: string;
  /** The ref the branch is compared with: the pull request's base, else the remote's default branch. */
  base: string;
  /** Where the branch forked from `base`; absent when they share no history. */
  mergeBase?: string;
  pullRequest?: GitPullRequest;
};

const git = async (dir: string, args: string[]): Promise<string | undefined> => {
  try {
    const { stdout } = await run('git', ['-C', dir, ...args], { timeout: TIMEOUT, maxBuffer: MAX_BUFFER });
    return stdout;
  } catch {
    return undefined;
  }
};

/** The nearest existing directory at or above `file`, so a file that is new on this branch still finds its repository. */
const existingDir = (file: string): string => {
  let dir = path.dirname(file);
  while (!existsSync(dir) && path.dirname(dir) !== dir) {
    dir = path.dirname(dir);
  }
  return dir;
};

/** A full or abbreviated commit id; anything else (an option, a ref expression) is refused. */
export const isCommit = (rev: string): boolean => /^[0-9a-f]{7,64}$/.test(rev);

/** The remote's default branch (`origin/main`), else the first of the usual names that exists. */
const defaultBranch = async (dir: string): Promise<string | undefined> => {
  const symbolic = (await git(dir, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']))?.trim();
  if (symbolic) {
    return symbolic;
  }
  for (const ref of ['origin/main', 'origin/master', 'main', 'master']) {
    if (await git(dir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])) {
      return ref;
    }
  }
  return undefined;
};

/** `owner/repo` of the checkout's origin on GitHub. */
const githubRepo = async (dir: string): Promise<string | undefined> =>
  (await git(dir, ['remote', 'get-url', 'origin']))
    ?.trim()
    .match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/)
    ?.slice(1, 3)
    .join('/');

/**
 * The open pull request `branch` heads: from `gh` when it is installed and signed in, else from GitHub's REST API
 * (unauthenticated unless `GITHUB_TOKEN` is set, which is enough for a public repository).
 */
const findPullRequest = async (
  dir: string,
  branch: string,
  env: NodeJS.ProcessEnv,
): Promise<GitPullRequest | undefined> => {
  try {
    const { stdout } = await run('gh', ['pr', 'view', branch, '--json', 'number,url,title,baseRefName,state'], {
      cwd: dir,
      timeout: TIMEOUT,
    });
    const pr = JSON.parse(stdout);
    if (pr.state === 'OPEN') {
      return { number: pr.number, url: pr.url, title: pr.title, base: pr.baseRefName };
    }
    return undefined;
  } catch {
    // No gh, not signed in, or no pull request: ask the API instead.
  }
  const repo = await githubRepo(dir);
  if (!repo) {
    return undefined;
  }
  try {
    const owner = repo.split('/')[0];
    const response = await fetch(
      `https://api.github.com/repos/${repo}/pulls?state=open&per_page=1&head=${encodeURIComponent(`${owner}:${branch}`)}`,
      {
        headers: {
          accept: 'application/vnd.github+json',
          ...(env.GITHUB_TOKEN && { authorization: `Bearer ${env.GITHUB_TOKEN}` }),
        },
        signal: AbortSignal.timeout(TIMEOUT),
      },
    );
    if (!response.ok) {
      return undefined;
    }
    const [pr] = await response.json();
    return pr ? { number: pr.number, url: pr.html_url, title: pr.title, base: pr.base.ref } : undefined;
  } catch {
    return undefined;
  }
};

/** Git queries for the dev server, created once per server with its environment and its own lookup cache. */
export type GitReader = {
  /** The status of the repository holding `file`, or undefined when it is not in a git working tree. */
  status: (file: string) => Promise<GitStatus | undefined>;
  /** `file`'s text at commit `rev`, or undefined when it did not exist there. */
  show: (file: string, rev: string) => Promise<string | undefined>;
};

export const createGitReader = (env: NodeJS.ProcessEnv = process.env): GitReader => {
  const pullRequests = new Map<string, { at: number; value?: GitPullRequest }>();

  const cachedPullRequest = async (dir: string, branch: string): Promise<GitPullRequest | undefined> => {
    const key = `${dir}\n${branch}`;
    const cached = pullRequests.get(key);
    if (cached && Date.now() - cached.at < PR_TTL) {
      return cached.value;
    }
    const value = await findPullRequest(dir, branch, env);
    pullRequests.delete(key);
    pullRequests.set(key, { at: Date.now(), value });
    // A map iterates in insertion order, so the first key is the lookup refreshed longest ago.
    if (pullRequests.size > MAX_PULL_REQUEST_LOOKUPS) {
      pullRequests.delete(pullRequests.keys().next().value ?? '');
    }
    return value;
  };

  const status = async (file: string): Promise<GitStatus | undefined> => {
    const dir = existingDir(file);
    const head = (await git(dir, ['rev-parse', 'HEAD']))?.trim();
    if (!head) {
      return undefined;
    }
    const branch = (await git(dir, ['symbolic-ref', '--short', '-q', 'HEAD']))?.trim() || undefined;
    const fallback = await defaultBranch(dir);
    const pullRequest =
      branch && branch !== fallback?.replace(/^origin\//, '') ? await cachedPullRequest(dir, branch) : undefined;
    // The pull request's base as the remote has it, since the local branch of that name may be stale or absent.
    const prBase =
      pullRequest &&
      (
        await Promise.all(
          [`origin/${pullRequest.base}`, pullRequest.base].map(async (ref) => ({
            ref,
            ok: Boolean(await git(dir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])),
          })),
        )
      ).find(({ ok }) => ok)?.ref;
    const resolved = prBase ?? fallback;
    const base = resolved ?? 'HEAD';
    // With no base branch to compare against there is no fork point, so diffing against the base is not offered.
    const mergeBase = resolved && ((await git(dir, ['merge-base', 'HEAD', resolved]))?.trim() || undefined);
    return {
      ...(branch && { branch }),
      head,
      base,
      ...(mergeBase && { mergeBase }),
      ...(pullRequest && { pullRequest }),
    };
  };

  const show = async (file: string, rev: string): Promise<string | undefined> => {
    if (!isCommit(rev)) {
      throw new Error(`Not a commit id: ${rev}`);
    }
    const dir = existingDir(file);
    // `./` makes the path relative to `dir` rather than to the repository's top level.
    const object = `${rev}:./${path.relative(dir, file)}`;
    // Git reports a commit it does not have the same way as a missing path, so the commit is checked first; this throws.
    await run('git', ['-C', dir, 'cat-file', '-e', `${rev}^{commit}`], { timeout: TIMEOUT });
    try {
      // The C locale keeps git's message in English, so `MISSING_PATH` matches whatever language the machine uses.
      const { stdout } = await run('git', ['-C', dir, 'show', object], {
        timeout: TIMEOUT,
        maxBuffer: MAX_BUFFER,
        env: { ...process.env, LC_ALL: 'C' },
      });
      return stdout;
    } catch (error) {
      // Only a path missing at `rev` means the file did not exist; any other failure must not read as an empty base.
      const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : '';
      if (MISSING_PATH.test(stderr)) {
        return undefined;
      }
      throw error;
    }
  };

  return { status, show };
};
