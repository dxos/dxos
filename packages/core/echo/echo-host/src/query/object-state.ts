//
// Copyright 2026 DXOS.org
//

export const isSaved = (storedHeads: readonly string[] | undefined, heads: readonly string[]): boolean =>
  storedHeads !== undefined && sameHeads(storedHeads, heads);

export const sameHeads = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((head) => right.includes(head));
