//
// Copyright 2026 DXOS.org
//

/**
 * A contiguous document region that can be selected, dragged, and reordered as a unit. Lives in its own
 * module so `drag.ts` and `selection.ts` can share it without importing from each other (a cycle that
 * makes the dev bundler instantiate the shared state field twice).
 */
export type Block = {
  from: number;
  to: number;
};
