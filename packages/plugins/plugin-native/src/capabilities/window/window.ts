//
// Copyright 2025 DXOS.org
//

import { LogicalPosition, LogicalSize, getCurrentWindow } from '@tauri-apps/api/window';
import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';

export default Capability.makeModule(() =>
  Effect.gen(function* () {
    const appWindow = getCurrentWindow();

    // Set up drag regions for window dragging.
    const cleanupDragRegions = setupWindowDrag(appWindow);

    // Save window state to localStorage.
    async function saveWindowState() {
      const size = await appWindow.innerSize();
      const position = await appWindow.innerPosition();
      localStorage.setItem(
        'windowState',
        JSON.stringify({
          width: size.width,
          height: size.height,
          x: position.x,
          y: position.y,
        }),
      );
    }

    // Restore window state from localStorage.
    async function restoreWindowState() {
      const savedState = localStorage.getItem('windowState');
      if (savedState) {
        const state = JSON.parse(savedState);

        await appWindow.setSize(new LogicalSize(state.width, state.height));
        await appWindow.setPosition(new LogicalPosition(state.x, state.y));
      }
    }

    // Listen for window events and save state.
    const unsubscribeResize = yield* Effect.tryPromise(() => appWindow.listen('tauri://resize', saveWindowState));
    const unsubscribeMove = yield* Effect.tryPromise(() => appWindow.listen('tauri://move', saveWindowState));

    // Restore state when app loads.
    document.addEventListener('DOMContentLoaded', restoreWindowState);

    // Save state before closing.
    window.addEventListener('beforeunload', saveWindowState);

    return Capability.contributes(Common.Capability.Null, null, () =>
      Effect.gen(function* () {
        cleanupDragRegions();
        document.removeEventListener('DOMContentLoaded', restoreWindowState);
        window.removeEventListener('beforeunload', saveWindowState);
        unsubscribeResize();
        unsubscribeMove();
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
