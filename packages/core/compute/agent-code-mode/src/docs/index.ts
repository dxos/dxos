//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/** One entry of `DOCS`, as the system prompt lists it so the model never has to guess a file name. */
export type DocEntry = {
  readonly name: string;
  /** What the file covers, in a line. */
  readonly covers: string;
};

/**
 * The static reference files. Each is imported dynamically so the markdown is a chunk of its own,
 * fetched by the first evaluation rather than by every bundle that imports the dialect.
 */
const FILES = [
  {
    name: 'README.md',
    covers: 'How to read and grep these docs, and how everything is addressed by DXN.',
    load: () => import('./README.md?raw'),
  },
  {
    name: 'database.md',
    covers: 'Resolving types; creating, updating, deleting; refs, relations, parents.',
    load: () => import('./database.md?raw'),
  },
  {
    name: 'queries.md',
    covers: 'Filters, comparisons, ordering, limits, following refs, relations, children.',
    load: () => import('./queries.md?raw'),
  },
  {
    name: 'operations.md',
    covers: 'Resolving an operation by DXN and invoking it.',
    load: () => import('./operations.md?raw'),
  },
  {
    name: 'errors.md',
    covers: 'Failures, `Effect.result`, and the mistakes that cost a call.',
    load: () => import('./errors.md?raw'),
  },
] as const;

export const STATIC_DOCS: readonly DocEntry[] = FILES.map(({ name, covers }) => ({ name, covers }));

/** The static reference, keyed by file name. */
export const loadDocs: Effect.Effect<Readonly<Record<string, string>>> = Effect.promise(async () =>
  Object.fromEntries(await Promise.all(FILES.map(async ({ name, load }) => [name, (await load()).default] as const))),
);
