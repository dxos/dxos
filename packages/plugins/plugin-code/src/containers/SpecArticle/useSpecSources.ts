//
// Copyright 2026 DXOS.org
//

import { type Extension } from '@codemirror/state';
import { useAtomValue } from '@effect/atom-react';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Atom from 'effect/reactivity/Atom';
import * as Schedule from 'effect/Schedule';
import { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Spec from '@dxos/compute/Spec';
import { type SourceKey, formatSourceKey, parseSourceKey } from '@dxos/deus/review';
import { useObject } from '@dxos/echo-react';
import { log } from '@dxos/log';
import * as FileSystem from '@dxos/plugin-file-system/FileSystem';
import * as ProjectCapabilities from '@dxos/plugin-projects/ProjectCapabilities';

import { resolvePath } from '#sync';
import { CodeCapabilities } from '#types';

const UNAVAILABLE = Atom.make<CodeCapabilities.SpecSyncState>({ available: false, roots: [], specs: {} });

/** The editor extensions contributed for a spec's document, rebuilt when its dialects change. */
export const useContributedExtensions = (
  document: Spec.Spec | undefined,
  options: Omit<ProjectCapabilities.SpecExtensionOptions, 'dialects'>,
): Extension[] => {
  const factories = Hooks.useCapabilities(ProjectCapabilities.SpecExtensions);
  const [dialects] = useObject(document, 'dialects');
  const { attendableId, t } = options;
  return useMemo(
    () =>
      document && dialects ? factories.flatMap((factory) => factory(document, { attendableId, dialects, t })) : [],
    [factories, document, attendableId, dialects, t],
  );
};

/** The spec sync's state: whether local files are reachable, the known checkouts, and each spec's last result. */
export const useSpecSyncState = (): CodeCapabilities.SpecSyncState & { syncNow?: () => void } => {
  const sync = Hooks.useOptionalCapability(CodeCapabilities.SpecSync);
  const state = useAtomValue(sync?.state ?? UNAVAILABLE);
  return { ...state, syncNow: sync?.syncNow };
};

/** How often related files are re-read, so a review an agent writes appears without reopening the spec. */
const REFRESH = '3 seconds';

/**
 * The texts of local files named by `github:` keys (fragments ignored), keyed by the key without fragment.
 * Re-read periodically; a file with no checkout or not on disk is absent from the map.
 */
export const useLocalTexts = (keys: readonly string[]): ReadonlyMap<string, string> => {
  const { available, roots } = useSpecSyncState();
  const [texts, setTexts] = useState<ReadonlyMap<string, string>>(new Map());
  // A string key, so callers passing a fresh array each render do not restart the polling.
  const keysKey = [...new Set(keys)].sort().join('\n');
  const rootsKey = roots.map(({ repo, path }) => `${repo}=${path}`).join('\n');

  useEffect(() => {
    if (!available || !keysKey) {
      setTexts(new Map());
      return;
    }
    const fs = FileSystem.get();
    const targets = keysKey.split('\n').flatMap((raw) => {
      const key = parseSourceKey(raw);
      const path = key && resolvePath(roots, key);
      return path ? [{ raw, path }] : [];
    });
    const load = Effect.forEach(targets, ({ raw, path }) =>
      fs.read(path).pipe(
        Effect.map((text) => [raw, text] as const),
        Effect.orElseSucceed(() => [raw, undefined] as const),
      ),
    ).pipe(
      Effect.map((entries) =>
        setTexts((previous) => {
          const next = new Map(entries.flatMap(([raw, text]) => (text === undefined ? [] : [[raw, text] as const])));
          // Keeps the previous map when nothing changed, so memoised graphs are not rebuilt every tick.
          const same = next.size === previous.size && [...next].every(([key, text]) => previous.get(key) === text);
          return same ? previous : next;
        }),
      ),
    );
    const fiber = Effect.runFork(load.pipe(Effect.repeat(Schedule.spaced(REFRESH))));
    return () => void Effect.runFork(Fiber.interrupt(fiber));
  }, [available, keysKey, rootsKey]);

  return texts;
};

/** The local path a key resolves to, for opening it in a desktop editor. */
export const useResolvedPath = (key: SourceKey | undefined): string | undefined => {
  const { roots } = useSpecSyncState();
  return useMemo(() => (key ? resolvePath(roots, key) : undefined), [key, roots]);
};

/** A key without its fragment, the form texts are keyed by. */
export const fileKey = (key: SourceKey): string => formatSourceKey(key, false);

/** How often the branch, its pull request and HEAD are re-read; a commit or a checkout moves them. */
const GIT_REFRESH = '10 seconds';

/** What diff mode compares the spec with: where its branch forked from the base, or the last commit. */
export type DiffAgainst = 'base' | 'head';

/**
 * The git status of the repository holding `path`, re-read periodically; undefined where the host cannot run git or
 * the file is not in a git working tree.
 */
export const useGitStatus = (path: string | undefined): FileSystem.GitStatus | undefined => {
  const [status, setStatus] = useState<FileSystem.GitStatus>();
  useEffect(() => {
    const git = FileSystem.get().git;
    if (!path || !git) {
      setStatus(undefined);
      return;
    }
    const load = git.status(path).pipe(
      Effect.orElseSucceed(() => undefined),
      Effect.map((next) =>
        // Keeps the previous object when nothing moved, so the base text is not fetched again every tick.
        setStatus((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next)),
      ),
    );
    const fiber = Effect.runFork(load.pipe(Effect.repeat(Schedule.spaced(GIT_REFRESH))));
    return () => void Effect.runFork(Fiber.interrupt(fiber));
  }, [path]);
  return status;
};

/** The text of `path` at commit `rev`: an empty string when the file did not exist there, undefined until loaded. */
export const useTextAt = (path: string | undefined, rev: string | undefined): string | undefined => {
  const [text, setText] = useState<{ key: string; text: string }>();
  const key = path && rev ? `${path}@${rev}` : undefined;
  useEffect(() => {
    const git = FileSystem.get().git;
    if (!path || !rev || !git) {
      return;
    }
    const fiber = Effect.runFork(
      git.show(path, rev).pipe(
        Effect.map((content) => setText({ key: `${path}@${rev}`, text: content ?? '' })),
        // A failed read stays unloaded rather than reading as an empty base, which would mark every line new.
        Effect.catch((error) => Effect.sync(() => log.warn('base text not read', { path, rev, error }))),
      ),
    );
    return () => void Effect.runFork(Fiber.interrupt(fiber));
  }, [path, rev]);
  // A text loaded for another file or commit is not shown while the new one loads.
  return text && text.key === key ? text.text : undefined;
};

export type SpecDiffState = {
  git?: FileSystem.GitStatus;
  /** What the spec is compared with; undefined outside diff mode. */
  diff?: DiffAgainst;
  setDiff: (diff: DiffAgainst | undefined) => void;
  /** The text diff mode compares with; undefined outside diff mode and while it loads. */
  baseText?: string;
  /** Whether diff mode can be offered: the checkout runs git, or a base was given. */
  available: boolean;
};

/**
 * Diff mode for a spec: the spec against where its branch forked from the base (the pull request's, else the default
 * branch), or against the last commit to see only what is not committed yet. `base` stands in for git's base where
 * the host cannot run git.
 */
export const useSpecDiff = (
  key: SourceKey | undefined,
  { base, defaultDiff }: { base?: string; defaultDiff?: DiffAgainst } = {},
): SpecDiffState => {
  const path = useResolvedPath(key);
  const git = useGitStatus(path);
  const [diff, setDiff] = useState<DiffAgainst | undefined>(defaultDiff);
  const rev = diff === 'base' ? git?.mergeBase : diff === 'head' ? git?.head : undefined;
  const gitBase = useTextAt(path, rev);
  const baseText = diff === undefined ? undefined : rev ? gitBase : diff === 'base' ? base : undefined;
  return { git, diff, setDiff, baseText, available: git !== undefined || base !== undefined };
};
