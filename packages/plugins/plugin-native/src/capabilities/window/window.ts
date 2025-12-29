//
// Copyright 2025 DXOS.org
//

import { LogicalPosition, LogicalSize, getCurrentWindow } from '@tauri-apps/api/window';

import { Capability, Common } from '@dxos/app-framework';

export default Capability.makeModule(() => {
  return Capability.contributes(Common.Capability.Null, null, () => {
    const appWindow = getCurrentWindow();

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
    void appWindow.listen('tauri://resize', saveWindowState);
    void appWindow.listen('tauri://move', saveWindowState);

    // Restore state when app loads.
    document.addEventListener('DOMContentLoaded', restoreWindowState);

    // Save state before closing.
    window.addEventListener('beforeunload', saveWindowState);
  });
});
