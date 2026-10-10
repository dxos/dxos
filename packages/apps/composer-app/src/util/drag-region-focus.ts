//
// Copyright 2026 DXOS.org
//

const FOCUSABLE =
  '[tabindex], a[href], button, input, select, textarea, [contenteditable]:not([contenteditable="false"])';

const CLICKABLE_TAGS = new Set(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL', 'SUMMARY']);
const INTERACTIVE_ROLES = new Set(['button', 'link', 'menuitem', 'tab', 'checkbox', 'radio', 'switch', 'option']);

const isClickable = (element: HTMLElement): boolean =>
  CLICKABLE_TAGS.has(element.tagName) ||
  (element.hasAttribute('contenteditable') && element.getAttribute('contenteditable') !== 'false') ||
  (element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1') ||
  INTERACTIVE_ROLES.has(element.getAttribute('role') ?? '');

/** Port of `isDragRegion` from Tauri 2.11's `window/scripts/drag.js`; keep in step with it. */
const isDragRegion = (path: EventTarget[]): boolean => {
  for (const element of path) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }

    const attr = element.getAttribute('data-tauri-drag-region');
    if (attr === null) {
      if (isClickable(element)) {
        return false;
      }
      continue;
    }
    if (attr === 'false') {
      return false;
    }
    if (attr === 'deep') {
      return true;
    }
    if (attr === '' || attr === 'true') {
      return element === path[0];
    }
  }

  return false;
};

/**
 * Tauri's drag-region handler cancels mousedown, which also cancels the focus move that attention follows,
 * so this focuses what the click would have.
 */
export const restoreDragRegionFocus = (target: Document = document): (() => void) => {
  const handleMouseDown = (event: MouseEvent) => {
    if (event.button !== 0 || !(event.target instanceof Element) || !isDragRegion(event.composedPath())) {
      return;
    }

    // A mouse click never shows the keyboard focus ring, and script focus can inherit it.
    event.target.closest<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true, focusVisible: false });
  };

  target.addEventListener('mousedown', handleMouseDown, true);
  return () => target.removeEventListener('mousedown', handleMouseDown, true);
};
