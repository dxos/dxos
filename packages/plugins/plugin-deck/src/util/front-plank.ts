//
// Copyright 2026 DXOS.org
//

type Box = Readonly<{ left: number; right: number; width: number }>;

/**
 * The index of a sliding deck's front plank: the first unfolded plank with at least half its width in view, where in
 * view excludes what the viewport clips and what the next plank, stacked over it, covers. -1 when none qualifies.
 */
export const getFrontPlankIndex = (rects: readonly Box[], viewport: Box, folded: readonly boolean[]): number =>
  rects.findIndex((rect, index) => {
    const right = Math.min(rect.right, viewport.right, rects[index + 1]?.left ?? Infinity);
    return !folded[index] && right - Math.max(rect.left, viewport.left) >= rect.width / 2;
  });
