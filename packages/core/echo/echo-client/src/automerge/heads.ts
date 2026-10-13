//
// Copyright 2026 DXOS.org
//

export const sameHeads = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((head) => right.includes(head));
