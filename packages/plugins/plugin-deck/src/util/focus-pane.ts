//
// Copyright 2026 DXOS.org
//

/**
 * Focuses a plank's pane so it gains attention. Focus already inside the pane gives it attention too,
 * and moving it would take it from an editor mid-keystroke.
 */
export const focusPane = (pane: HTMLElement | null | undefined): void => {
  if (!pane || pane.contains(pane.ownerDocument.activeElement)) {
    return;
  }
  pane.focus({ preventScroll: true });
};
