//
// Copyright 2026 DXOS.org
//

/** Set on `document.body` while the user is navigating by keyboard. */
export const KEYBOARD_MODALITY_ATTR = 'data-w-keyboard';

// Keys that move focus. A character key typed into a field is not navigation, so it must not
// flip the modality — that is the distinction consumers rely on to tell a click-driven focus
// change from a keyboard-driven one.
const NAVIGATION_KEYS = new Set([
  'Tab',
  'Escape',
  'Enter',
  ' ',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

/**
 * Reflects the current input modality onto the document body, replacing `keyborg` (6.3 KB of the
 * eager boot graph) with the one signal this repo reads from it.
 *
 * Returns a disposer.
 */
export const trackKeyboardModality = (window: Window): (() => void) => {
  const { document } = window;
  const set = (keyboard: boolean) => {
    if (keyboard) {
      document.body.setAttribute(KEYBOARD_MODALITY_ATTR, 'true');
    } else {
      document.body.removeAttribute(KEYBOARD_MODALITY_ATTR);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => NAVIGATION_KEYS.has(event.key) && set(true);
  const handlePointerDown = () => set(false);

  // Capture so a handler calling `stopPropagation` cannot leave the modality stale.
  window.addEventListener('keydown', handleKeyDown, true);
  window.addEventListener('pointerdown', handlePointerDown, true);

  return () => {
    window.removeEventListener('keydown', handleKeyDown, true);
    window.removeEventListener('pointerdown', handlePointerDown, true);
  };
};
