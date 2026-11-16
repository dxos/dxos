//
// Copyright 2026 DXOS.org
//

/**
 * The frame every panel floating over the canvas takes (toolbars, palette, theme bar, frame header, inspectors), so
 * they share one surface, edge and shadow.
 */
export const FLOATING_PANEL = 'rounded-sm bg-modal-surface border border-separator shadow-sm';

/** A floating panel laid out as one row of controls: the same inset on every side, as the controls bring their own. */
export const FLOATING_BAR = `gap-1 p-1 ${FLOATING_PANEL}`;
