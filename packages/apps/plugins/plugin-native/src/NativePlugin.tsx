//
// Copyright 2023 DXOS.org
//

import { HELP_PLUGIN } from '@braneframe/plugin-help/meta';
import { NAVTREE_PLUGIN } from '@braneframe/plugin-navtree/meta';
import type { Plugin, PluginDefinition } from '@dxos/app-framework';
import { NavigationAction, SettingsAction, LayoutAction, parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { safeParseJson } from '@dxos/util';

import meta from './meta';

// TODO(burdon): Reconcile with other properties.
const KEY_WINDOW_SIZE = 'dxos.org/plugin/native/window-size';

/**
 * Native code for socketsupply app.
 * https://www.npmjs.com/package/@socketsupply/socket
 * https://github.com/socketsupply/socket-examples
 */
const initializeNativeApp = async (plugins: Plugin[]) => {
  // SocketSupply implements the dynamic import.
  const module = 'socket:application';
  const app = await import(/* @vite-ignore */ module);
  const appWindow = await app.getCurrentWindow();
  const windowModule = 'socket:window';
  const socketWindow = await import(/* @vite-ignore */ windowModule);
  const { meta_title: appName } = app.config;
  const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

  const binding = await socketWindow.hotkey.bind('cmd + k');
  console.log(binding);

  //
  // Window size.
  //

  const win = await app.getCurrentWindow();
  const { width, height } = safeParseJson<{ width?: number; height?: number }>(
    localStorage.getItem(KEY_WINDOW_SIZE),
    {},
  );
  if (width && height) {
    await win.setSize({ width, height });
  }

  window.addEventListener('resize', async () => {
    const window = await app.getCurrentWindow();
    const { width, height } = window.getSize();
    localStorage.setItem(KEY_WINDOW_SIZE, JSON.stringify({ width, height }));
  });

  //
  // System menu.
  //

  // TODO(mjamesderocher) make this conditional with `if (process.platform === 'darwin')`
  // https://github.com/dxos/dxos/issues/5689 has been opened to fix how we implement `process`.
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

  await app.setSystemMenu({ index: 0, value: menu });

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

  // applicationurl is a custom event fired by the Socket Supply Runtime:
  // https://github.com/socketsupply/socket/blob/ef7fb5559876e41062d5896aafb7b79989fc96e5/api/internal/events.js#L6
  window.addEventListener('applicationurl', ({ url }: any) => {
    appWindow.restore();
    void intentPlugin?.provides.intent.dispatch({
      action: NavigationAction.ACTIVATE,
      data: { id: url.host },
    });
  });

  // Global hotkey listener
  binding.addEventListener('hotkey', () => {
    console.log('Key pressed');
    appWindow.restore();
    void intentPlugin?.provides.intent.dispatch({
      action: LayoutAction.SET_LAYOUT,
      data: { element: 'dialog', component: `${NAVTREE_PLUGIN}/Commands` },
    });
  });

  // TODO(burdon): Initial url has index.html, which must be caught/redirected.
  log.info('native setup complete');
};

export const NativePlugin = (): PluginDefinition => ({
  meta,
  ready: async (plugins) => {
    await initializeNativeApp(plugins);
  },
});
