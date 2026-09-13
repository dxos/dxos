//
// Copyright 2026 DXOS.org
//

/**
 * Focuses a plank's pane so it gains attention. Focus already inside the pane gives it attention too,
 * and moving it would take it from an editor mid-keystroke; focus in an open menu is the user's, and
 * moving it would dismiss the menu.
 */
export const focusPane = (pane: HTMLElement | null | undefined): void => {
  if (!pane) {
    return;
  }
  const active = pane.ownerDocument.activeElement;
  if (pane.contains(active) || active?.closest('[role="menu"], [role="listbox"]')) {
    return;
  }
  pane.focus({ preventScroll: true });
};
