//
// Copyright 2026 DXOS.org
//

/** Changes (commits) past which a document is reported as oversized. */
export const OVERSIZED_DOCUMENT_CHANGES = 1_000_000;

/**
 * Ops past which a document is reported as oversized. Checked alongside changes because a few huge changes
 * bloat a document as surely as many small ones: the 45.7M-op cursor that ran out of memory had 156 changes.
 */
export const OVERSIZED_DOCUMENT_OPS = 1_000_000;

export type DocumentSize = { changes: number; ops: number };

/**
 * How many times over the limits a document is, as a doubling level: 0 at the limit, 1 at twice it, and so on;
 * -1 while it is within both limits. Reporting only when the level rises keeps the warning to one per doubling.
 */
export const oversizeLevel = ({ changes, ops }: DocumentSize): number => {
  const ratio = Math.max(changes / OVERSIZED_DOCUMENT_CHANGES, ops / OVERSIZED_DOCUMENT_OPS);
  return ratio < 1 ? -1 : Math.floor(Math.log2(ratio));
};
