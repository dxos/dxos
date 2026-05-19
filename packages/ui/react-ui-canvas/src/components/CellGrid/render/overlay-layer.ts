//
// Copyright 2026 DXOS.org
//

import type { Headers, Selection, Viewport } from '../state/types';
import { cellWidth, worldToScreen } from '../state/viewport';

export type OverlayStyle = {
  playhead: string;
  selectionFill: string;
  selectionStroke: string;
};

export type DrawOverlayOptions = {
  ctx: CanvasRenderingContext2D;
  size: { width: number; height: number };
  viewport: Viewport;
  headers: Headers;
  selection: Selection;
  /** Playhead position in world units (col + fraction), or null when not playing. */
  playhead: number | null;
  style: OverlayStyle;
};

export const drawOverlay = ({ ctx, size, viewport, headers, selection, playhead, style }: DrawOverlayOptions): void => {
  ctx.clearRect(0, 0, size.width, size.height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(headers.left, headers.top, size.width - headers.left, size.height - headers.top);
  ctx.clip();

  // Selection rectangle.
  if (selection.range) {
    const { col0, row0, col1, row1 } = selection.range;
    const minCol = Math.min(col0, col1);
    const maxCol = Math.max(col0, col1);
    const minRow = Math.min(row0, row1);
    const maxRow = Math.max(row0, row1);
    const tl = worldToScreen(viewport, headers, { col: minCol, row: minRow });
    const br = worldToScreen(viewport, headers, { col: maxCol + 1, row: maxRow + 1 });
    ctx.fillStyle = style.selectionFill;
    ctx.fillRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
    ctx.strokeStyle = style.selectionStroke;
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1;
    ctx.strokeRect(tl.x + 0.5, tl.y + 0.5, br.x - tl.x - 1, br.y - tl.y - 1);
    ctx.setLineDash([]);
  }

  // Playhead.
  if (playhead !== null) {
    const w = cellWidth(viewport);
    const x = headers.left + playhead * w - viewport.scrollX;
    if (x >= headers.left && x <= size.width) {
      ctx.strokeStyle = style.playhead;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, headers.top);
      ctx.lineTo(x, size.height);
      ctx.stroke();
    }
  }

  ctx.restore();
};
