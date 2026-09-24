//
// Copyright 2026 DXOS.org
//

//
// Anchors as the scene engine's ports (MIGRATION.md §2.2): an anchor is a point relative to the shape's
// centre, a port is a side and an offset along it; the anchor id says which way a link may run.
//

import { type Anchor } from '@dxos/react-ui-canvas-editor';
import { type Port, type Size } from '@dxos/react-ui-canvas/scene';

import { parseAnchorId } from '../shapes/defs.ts';

/** The ports of a shape from its anchors; a port's direction comes from the `input.` / `output.` prefix. */
export const anchorsToPorts = (anchors: Record<string, Anchor>, size: Size): Port[] =>
  Object.values(anchors).map(({ id, pos }) => {
    const [kind] = parseAnchorId(id);
    const half = { x: size.width / 2, y: size.height / 2 };
    // The anchor sits on whichever edge it is nearer to; ties go to the vertical edges (the input / output sides).
    const vertical = Math.abs(Math.abs(pos.x) - half.x) <= Math.abs(Math.abs(pos.y) - half.y);
    const side = vertical ? (pos.x < 0 ? 'w' : 'e') : pos.y < 0 ? 'n' : 's';
    const along = vertical ? (pos.y + half.y) / size.height : (pos.x + half.x) / size.width;
    return {
      id,
      side,
      offset: Math.min(Math.max(along, 0), 1),
      ...(kind === 'input' ? { accepts: 'in' as const } : kind === 'output' ? { accepts: 'out' as const } : {}),
    };
  });
