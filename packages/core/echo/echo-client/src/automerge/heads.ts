//
// Copyright 2026 DXOS.org
//

/** Whether two sets of document heads name the same changes, in any order. */
export const sameHeads = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((head) => right.includes(head));
