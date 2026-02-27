//
// Copyright 2025 DXOS.org
//

import { getCurrentWindow } from '@tauri-apps/api/window';
import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';

/**
 * Window capability module.
 * Sets up window drag regions for Tauri windows.
 * Note: Window state persistence (size/position) is handled on the Rust side
 * in src-tauri/src/window_state.rs for instant restoration on startup.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const appWindow = getCurrentWindow();

    // Set up drag regions for window dragging.
    const cleanupDragRegions = setupWindowDrag(appWindow);

    return Capability.contributes(
      Capabilities.Null,
      null,
      Effect.fnUntraced(function* () {
        cleanupDragRegions();
      }),
    );
  }),
);

/**
 * Interactive element selectors that should not trigger window dragging.
 */
const INTERACTIVE_SELECTORS = '.app-no-drag, button, a, input, select, textarea, [role="button"], [role="menuitem"]';

/**
 * Sets up window drag regions.
 *
 * Tauri 2.0 does not support the `-webkit-app-region` CSS property with overlay titlebars.
 * This uses the Tauri window API to enable dragging on elements with the `app-drag` class.
 */
const setupWindowDrag = (appWindow: ReturnType<typeof getCurrentWindow>): (() => void) => {
  const handleMouseDown = (event: MouseEvent) => {
    const target = event.target as Element | null;
    if (!target) {
      return;
    }

    // Check if the click target or any ancestor has the app-drag class.
    const dragElement = target.closest('.app-drag');
    if (!dragElement) {
      return;
    }

    // Don't trigger drag on interactive elements within the drag region.
    const interactiveElement = target.closest(INTERACTIVE_SELECTORS);
    if (interactiveElement && dragElement.contains(interactiveElement)) {
      return;
    }

    event.preventDefault();
    void appWindow.startDragging();
  };

  document.addEventListener('mousedown', handleMouseDown);

  return () => {
    document.removeEventListener('mousedown', handleMouseDown);
  };
};
