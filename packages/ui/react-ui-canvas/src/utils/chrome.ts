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

/**
 * A rule between a floating bar's groups, drawn from edge to edge as the tool palette's are: it stretches across the
 * bar and takes back the bar's inset, where a toolbar's own rule is half a control tall.
 */
export const FLOATING_BAR_RULE = 'self-stretch h-auto -my-1 mx-0';
