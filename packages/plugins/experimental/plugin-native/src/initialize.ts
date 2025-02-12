//
// Copyright 2025 DXOS.org
//

import type { PluginsContext } from '@dxos/app-framework';
import { SettingsAction, LayoutAction, createIntent, Capabilities } from '@dxos/app-framework';
import { HELP_PLUGIN } from '@dxos/plugin-help';
import { COMMANDS_DIALOG } from '@dxos/plugin-navtree';
import { safeParseJson } from '@dxos/util';

// TODO(burdon): Reconcile with other properties.
const KEY_WINDOW_SIZE = 'dxos.org/plugin/native/window-size';

/**
 * Native code for socketsupply app.
 * https://www.npmjs.com/package/@socketsupply/socket
 * https://github.com/socketsupply/socket-examples
 */

const loadSocketSupplyModules = async () => {
  // SocketSupply implements the dynamic import.
  const module = 'socket:application';
  const app = await import(/* @vite-ignore */ module);
  const windowModule = 'socket:window';
  const socketWindow = await import(/* @vite-ignore */ windowModule);
  const processModule = 'socket:process';
  const socketProcess = await import(/* @vite-ignore */ processModule);
  const { meta_title: appName } = app.config;

  return { app, socketWindow, socketProcess, appName };
};

const configureDesktopWindowSizing = async (app: any) => {
  const { width, height } = safeParseJson<{ width?: number; height?: number }>(
    localStorage.getItem(KEY_WINDOW_SIZE),
    {},
  );

  if (width && height) {
    const appWindow = await app.getCurrentWindow();
    await appWindow.setSize({ width, height });
  }

  window.addEventListener('resize', async () => {
    const appWindow = await app.getCurrentWindow();
    const { width, height } = appWindow.getSize();
    localStorage.setItem(KEY_WINDOW_SIZE, JSON.stringify({ width, height }));
  });
};

const configureSystemMenu = async (app: any, appName: string) => {
  const itemsMac = `
    Hide ${appName}: h + CommandOrControl
    Hide Others: h + Control + Meta
    ---
  `;

  // TODO(mjamesderocher) Change menu names to use translations
  const menu = `
    App Name:
      About ${appName}: _
      Settings...: , + CommandOrControl
      ---
      Show shortcuts: / + CommandOrControl
      Search commands: k + CommandOrControl
      ---
      ${itemsMac}
      Quit: q + CommandOrControl
    ;

    Edit:
      Cut: x + CommandOrControl
      Copy: c + CommandOrControl
      Paste: v + CommandOrControl
      Delete: _
      Select All: a + CommandOrControl
    ;
  `;

  void app.setSystemMenu({ index: 0, value: menu });
};

const setupMenuItemListener = (dispatch: any, app: any) => {
  window.addEventListener('menuItemSelected', async (event: any) => {
    const id = `${event.detail.parent}:${event.detail.title}`;
    switch (id) {
      case 'App Name:Search commands': {
        void dispatch(
          createIntent(LayoutAction.UpdateDialog, {
            part: 'dialog',
            subject: COMMANDS_DIALOG,
            options: {
              blockAlign: 'start',
            },
          }),
        );
        break;
      }
      case 'App Name:Settings...': {
        void dispatch(createIntent(SettingsAction.Open));
        break;
      }
      case 'App Name:Show shortcuts': {
        void dispatch(
          createIntent(LayoutAction.UpdateDialog, {
            part: 'dialog',
            subject: `${HELP_PLUGIN}/Shortcuts`,
            options: {
              blockAlign: 'center',
            },
          }),
        );
        break;
      }
      case 'App Name:Quit': {
        await app.exit();
        break;
      }
    }
  });
};

const setupApplicationUrlListener = (app: any, dispatch: any) => {
  const appWindow = app.getCurrentWindow();

  // applicationurl is a custom event fired by the Socket Supply Runtime:
  // https://github.com/socketsupply/socket/blob/ef7fb5559876e41062d5896aafb7b79989fc96e5/api/internal/events.js#L6
  window.addEventListener('applicationurl', ({ url }: any) => {
    appWindow.restore();
    const location = url.toString().replace('composer://', '');
    if (location.includes('InvitationCode')) {
      // TODO(mjamesderocher): Integrate this with app routing.
      // Currently, the dialogs are controlled by Client Plugin and not the Layout Plugin.
      window.location.href = location;
    } else {
      // TODO(thure): What is `location` and is this right?
      void dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [location] }));
    }
  });
};

const setupGlobalHotkey = async (socketWindow: any, appWindow: any, dispatch: any) => {
  const binding = await socketWindow.hotkey.bind('cmd + k');

  // Global hotkey listener
  binding.addEventListener('hotkey', () => {
    appWindow.restore();
    void dispatch(
      createIntent(LayoutAction.UpdateDialog, {
        part: 'dialog',
        subject: COMMANDS_DIALOG,
        options: {
          blockAlign: 'start',
        },
      }),
    );
  });
};

export const initializeNativeApp = async (context: PluginsContext) => {
  const { app, socketWindow, socketProcess, appName } = await loadSocketSupplyModules();
  const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);

  document.body.setAttribute('data-platform', socketProcess.platform);

  if (socketProcess.platform === 'mac' || socketProcess.platform === 'win') {
    await configureDesktopWindowSizing(app);
    await configureSystemMenu(app, appName);
    setupMenuItemListener(dispatch, app);
    setupApplicationUrlListener(app, dispatch);
    await setupGlobalHotkey(socketWindow, app, dispatch);
  }
};
