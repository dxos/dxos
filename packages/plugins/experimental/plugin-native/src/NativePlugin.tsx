//
// Copyright 2023 DXOS.org
//

import { HELP_PLUGIN } from '@dxos/plugin-help/meta';
import { NAVTREE_PLUGIN } from '@dxos/plugin-navtree/meta';
import type { Plugin, PluginDefinition } from '@dxos/app-framework';
import { NavigationAction, SettingsAction, LayoutAction, parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';
import { safeParseJson } from '@dxos/util';

import meta from './meta';

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
  const { meta_title: appName } = app.config;

  return { app, socketWindow, appName };
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

const setupMenuItemListener = (intentPlugin: any, app: any) => {
  window.addEventListener('menuItemSelected', async (event: any) => {
    const id = `${event.detail.parent}:${event.detail.title}`;
    switch (id) {
      case 'App Name:Search commands': {
        void intentPlugin?.provides.intent.dispatch({
          action: LayoutAction.SET_LAYOUT,
          data: { element: 'dialog', component: `${NAVTREE_PLUGIN}/Commands` },
        });
        break;
      }
      case 'App Name:Settings...': {
        void intentPlugin?.provides.intent.dispatch({
          action: SettingsAction.OPEN,
        });
        break;
      }
      case 'App Name:Show shortcuts': {
        void intentPlugin?.provides.intent.dispatch({
          action: LayoutAction.SET_LAYOUT,
          data: {
            element: 'dialog',
            component: `${HELP_PLUGIN}/Shortcuts`,
          },
        });
        break;
      }
      case 'App Name:Quit': {
        await app.exit();
        break;
      }
    }
  });
};

const setupApplicationUrlListener = (app: any, intentPlugin: any) => {
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
      void intentPlugin?.provides.intent.dispatch({
        action: NavigationAction.OPEN,
        // TODO(thure): what is `location` and is this right?
        data: { activeParts: { main: [location] } },
      });
    }
  });
};

const setupGlobalHotkey = async (socketWindow: any, appWindow: any, intentPlugin: any) => {
  const binding = await socketWindow.hotkey.bind('cmd + k');

  // Global hotkey listener
  binding.addEventListener('hotkey', () => {
    appWindow.restore();
    void intentPlugin?.provides.intent.dispatch({
      action: LayoutAction.SET_LAYOUT,
      data: { element: 'dialog', component: `${NAVTREE_PLUGIN}/Commands` },
    });
  });
};

const initializeNativeApp = async (plugins: Plugin[]) => {
  const { app, socketWindow, appName } = await loadSocketSupplyModules();
  const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

  if (process.platform === 'darwin' || process.platform === 'win32') {
    await configureDesktopWindowSizing(app);
    await configureSystemMenu(app, appName);
    setupMenuItemListener(intentPlugin, app);
    setupApplicationUrlListener(app, intentPlugin);
    await setupGlobalHotkey(socketWindow, app, intentPlugin);
  }
};

// TODO(burdon): Initial url has index.html, which must be caught/redirected.
export const NativePlugin = (): PluginDefinition => ({
  meta,
  ready: async (plugins) => {
    await initializeNativeApp(plugins);
  },
});
