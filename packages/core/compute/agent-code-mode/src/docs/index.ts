//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

/**
 * The Effect dialect's reference, bound in scope as `DOCS` so the model reads the part it needs
 * rather than the system prompt carrying all of it. Imported dynamically so the markdown is a chunk
 * of its own, fetched by the first evaluation rather than by every bundle that imports the dialect.
 */
export const loadDocs: Effect.Effect<Readonly<Record<string, string>>> = Effect.promise(async () => {
  const [readme, database, queries, operations, errors] = await Promise.all([
    import('./README.md?raw'),
    import('./database.md?raw'),
    import('./queries.md?raw'),
    import('./operations.md?raw'),
    import('./errors.md?raw'),
  ]);
  return {
    'README.md': readme.default,
    'database.md': database.default,
    'queries.md': queries.default,
    'operations.md': operations.default,
    'errors.md': errors.default,
  };
});
