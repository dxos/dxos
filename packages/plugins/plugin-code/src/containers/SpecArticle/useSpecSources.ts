//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Atom from 'effect/reactivity/Atom';
import * as Schedule from 'effect/Schedule';
import { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';

import { type SourceKey, formatSourceKey, getSpecFs, parseSourceKey, resolvePath } from '#sync';
import { CodeCapabilities } from '#types';

const UNAVAILABLE = Atom.make<CodeCapabilities.SpecSyncState>({ available: false, roots: [], specs: {} });

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
    const fs = getSpecFs();
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
