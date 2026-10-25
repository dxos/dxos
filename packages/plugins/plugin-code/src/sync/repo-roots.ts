//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as FileSystem from '@dxos/plugin-file-system/FileSystem';

import { type SourceKey, repoId } from './spec-key.ts';

/** `owner/repo` from a GitHub remote URL (`git@github.com:o/r.git`, `https://github.com/o/r`). */
export const parseGitHubRemote = (url: string): string | undefined =>
  url
    .match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/)
    ?.slice(1, 3)
    .join('/');

/** The `origin` remote's URL in a git config file, else the first remote's. */
export const parseGitConfigRemote = (config: string): string | undefined => {
  const remotes = [...config.matchAll(/\[remote "([^"]+)"\]([^[]*)/g)].map(([, name, body]) => ({
    name,
    url: body.match(/^\s*url\s*=\s*(.+?)\s*$/m)?.[1],
  }));
  return (remotes.find(({ name }) => name === 'origin') ?? remotes[0])?.url;
};

/**
 * The `owner/repo` a working tree checks out. A linked worktree's `.git` is a file naming its gitdir
 * (`<main>/.git/worktrees/<name>`), whose shared config sits two levels up.
 */
export const detectRepo = Effect.fnUntraced(function* (fs: FileSystem.FileSystem, path: string) {
  const dotGit = yield* fs.read(`${path}/.git`).pipe(Effect.orElseSucceed(() => undefined));
  const gitdir = dotGit?.match(/^gitdir:\s*(.+?)\s*$/m)?.[1];
  const configPath = gitdir
    ? `${gitdir.startsWith('/') ? gitdir : `${path}/${gitdir}`}/../../config`
    : `${path}/.git/config`;
  const config = yield* fs.read(configPath).pipe(Effect.orElseSucceed(() => undefined));
  const url = config && parseGitConfigRemote(config);
  return url ? parseGitHubRemote(url) : undefined;
});

/**
 * Parses a settings entry: `/abs/path`, or `owner/repo=/abs/path` to name the repository explicitly
 * (needed when the checkout's remote is not on GitHub).
 */
export const parseRepoEntry = (entry: string): { repo?: string; path: string } | undefined => {
  const trimmed = entry.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return undefined;
  }
  const match = trimmed.match(/^([\w.-]+\/[\w.-]+)=(.+)$/);
  return match ? { repo: match[1], path: match[2] } : { path: trimmed };
};

/** Every known checkout: configured entries first (so they win), then the host's own working tree. */
export const resolveRoots = Effect.fnUntraced(function* (fs: FileSystem.FileSystem, entries: readonly string[] = []) {
  const configured = yield* Effect.forEach(
    entries.map(parseRepoEntry).filter((entry) => entry !== undefined),
    (entry) =>
      entry.repo
        ? Effect.succeed<FileSystem.RepoRoot | undefined>({ repo: entry.repo, path: entry.path })
        : detectRepo(fs, entry.path).pipe(Effect.map((repo) => (repo ? { repo, path: entry.path } : undefined))),
  );
  const host = yield* fs.roots().pipe(Effect.orElseSucceed((): FileSystem.RepoRoot[] => []));
  return [...configured.filter((root) => root !== undefined), ...host];
});

/**
 * The absolute path a key names, when its repository is checked out locally. A key whose path is absolute or climbs
 * with `..` resolves to nothing, since a key comes from document text and must stay inside its checkout.
 */
export const resolvePath = (roots: readonly FileSystem.RepoRoot[], key: SourceKey): string | undefined => {
  const segments = key.path.split('/');
  if (key.path.startsWith('/') || segments.includes('..') || segments.includes('.')) {
    return undefined;
  }
  const root = roots.find(({ repo }) => repo.toLowerCase() === repoId(key).toLowerCase());
  return root && `${root.path}/${key.path}`;
};
