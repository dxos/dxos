//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Record from 'effect/Record';
import { useEffect, useState } from 'react';

/** A spec imported with `?spec`: its repo-relative path and its text when the bundle was built. */
export type SpecFile = { readonly path: string; readonly text: string };

/**
 * The published copy of a spec, served beside a static build at `specs/<path>`, else its bundled text.
 * `no-store` because the copy is replaced in place by a spec-only republish.
 */
const fetchSpecText = (file: SpecFile): Effect.Effect<string> =>
  Effect.tryPromise(() => fetch(new URL(`specs/${file.path}`, document.baseURI), { cache: 'no-store' })).pipe(
    Effect.filterOrFail((response) => response.ok),
    Effect.flatMap((response) => Effect.tryPromise(() => response.text())),
    Effect.orElseSucceed(() => file.text),
  );

/**
 * The text a story renders for a spec, resolved the way `useSpecTexts` does; a play function compares
 * against it because Storybook runs play functions in a static build too.
 */
export const resolveSpecText = (file: SpecFile): Effect.Effect<string> =>
  import.meta.env.DEV ? Effect.succeed(file.text) : fetchSpecText(file);

/**
 * Spec texts for a story: the bundled text under the dev server (which hot-reloads it), and in a static
 * build the published copies, fetched on every mount so a story switch shows a republished spec.
 * Undefined until a static build's fetches settle.
 */
export const useSpecTexts = <K extends string>(
  files: Record<K, SpecFile | undefined>,
): Record<K, string | undefined> | undefined => {
  const [fetched, setFetched] = useState<Record<K, string | undefined>>();
  // Keyed by path, since callers pass a fresh record on every render.
  const key = Object.values<SpecFile | undefined>(files)
    .map((file) => file?.path ?? '')
    .join('\n');
  useEffect(() => {
    if (import.meta.env.DEV) {
      return;
    }
    const fiber = Effect.runFork(
      Effect.forEach(
        Object.values<SpecFile | undefined>(files).filter((file) => file !== undefined),
        (file) => fetchSpecText(file).pipe(Effect.map((text) => [file.path, text] as const)),
        { concurrency: 'unbounded' },
      ).pipe(
        Effect.map((entries) => new Map(entries)),
        Effect.tap((texts) => Effect.sync(() => setFetched(Record.map(files, (file) => file && texts.get(file.path))))),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [key]);
  return import.meta.env.DEV ? Record.map(files, (file) => file?.text) : fetched;
};
