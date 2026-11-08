//
// Copyright 2026 DXOS.org
//

/**
 * Marks an element whose content can name a point in its own terms (a text editor by document position), so another
 * view of the same content, laid out differently, can find the same point. Shared by the surfaces that render content
 * and whatever places remote pointers over it.
 */
export const DX_POINTER_ANCHORS_ATTR = 'data-dx-pointer-anchors';

/**
 * Asks the content under a client point for an anchor there. Dispatched, bubbling, at the element under the point; a
 * marked element that handles it fills in `anchor` and `offset` before `dispatchEvent` returns.
 */
export const DX_ANCHOR_AT_POINT = 'dx-anchor-at-point';

export type AnchorAtPointDetail = {
  x: number;
  y: number;
  /** An anchor in the content's own format, set by the handler. */
  anchor?: string;
  /** The point's distance from where the anchor is drawn, in CSS pixels, set by the handler. */
  offset?: { x: number; y: number };
};

/**
 * Asks a marked element where an anchor is drawn now. Dispatched at each marked element in turn; one whose content
 * holds the anchor fills in `point` before `dispatchEvent` returns.
 */
export const DX_POINT_AT_ANCHOR = 'dx-point-at-anchor';

export type PointAtAnchorDetail = {
  anchor: string;
  offset: { x: number; y: number };
  /** The client point, set by the handler. */
  point?: { x: number; y: number };
};
