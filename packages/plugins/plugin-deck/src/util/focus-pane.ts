//
// Copyright 2026 DXOS.org
//

import { INITIAL_FOCUS_ATTRIBUTE, findFocusableDescendant, isTabbable } from '@dxos/react-focus';

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

/** How long a plank waits for a lazy article's content before leaving focus where it is. */
const CONTENT_FOCUS_WINDOW_MS = 2_000;

/**
 * Focuses a plank's content: the control inside what its article marks as the initial focus target
 * (see `INITIAL_FOCUS_ATTRIBUTE`). Neither is usually there when the plank mounts — the article is
 * lazy, and an editor builds its control in an effect after its wrapper — so focus lands on the
 * nearest thing that exists (the pane, then the marked wrapper) and moves into the control when it
 * arrives, unless the reader has moved focus out of the plank meanwhile, in which case it is left
 * alone. An article that declares nothing keeps focus on the pane, where Enter dives in; its first
 * tabbable is a toolbar button, not its content. Returns a release for the wait.
 */
export const focusContent = (pane: HTMLElement | null | undefined): (() => void) | undefined => {
  if (!pane) {
    return;
  }
  const document = pane.ownerDocument;
  // Lands as deep as the content allows; true once it reached the control itself.
  const enter = (): boolean => {
    const mark = pane.querySelector<HTMLElement>(`[${INITIAL_FOCUS_ATTRIBUTE}]`);
    if (!mark) {
      return false;
    }
    const control = findFocusableDescendant(mark);
    (control ?? (isTabbable(mark) ? mark : pane)).focus({ preventScroll: true });
    return control !== null;
  };

  if (enter()) {
    return;
  }
  if (!pane.contains(document.activeElement)) {
    pane.focus({ preventScroll: true });
  }

  const observer = new MutationObserver(() => {
    if (!pane.contains(document.activeElement)) {
      release();
      return;
    }
    if (enter()) {
      release();
    }
  });
  const timer = setTimeout(() => observer.disconnect(), CONTENT_FOCUS_WINDOW_MS);
  const release = () => {
    observer.disconnect();
    clearTimeout(timer);
  };
  observer.observe(pane, { childList: true, subtree: true });
  return release;
};
