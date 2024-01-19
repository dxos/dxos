//
// Copyright 2023 DXOS.org
//

import type { Plugin, PluginDefinition } from '@dxos/app-framework';
import { LayoutAction, parseIntentPlugin, resolvePlugin } from '@dxos/app-framework';
import { log } from '@dxos/log';

import meta from './meta';

// TODO(burdon): Reconcile with other properties.
const KEY_WINDOW_SIZE = 'dxos.org/composer/settings/window/size';

/**
 * Native code for socketsupply app.
 * https://www.npmjs.com/package/@socketsupply/socket
 * https://github.com/socketsupply/socket-examples
 */
export const initializeNativeApp = async (plugins: Plugin[]) => {
  // SocketSupply implements the dynamic import.
  const module = 'socket:application';
  const app = await import(/* @vite-ignore */ module);
  const { meta_title: appName } = app.config;
  const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

  const handleNavigate = (id: string) => {
    void intentPlugin?.provides.intent.dispatch({
      action: LayoutAction.ACTIVATE,
      data: { id },
    });
  };

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

  let itemsMac = '';
  if (process.platform === 'darwin') {
    itemsMac = `
      Hide: h + CommandOrControl
      Hide Others: h + Control + Meta
      ---
    `;
  }

  const menu = `
    App Name:
      About ${appName}: _
      Settings...: , + CommandOrControl
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
      case 'App Name:Quit': {
        await app.exit();
        break;
      }
    }
  });

  window.addEventListener('applicationurl', (event: any) => {
    const slug = event.url.host;

    if (slug.match(/^[a-z0-9]{64}$/)) {
      handleNavigate(slug);
    } else {
      alert('URL is not supported\nPlease check that it was copied or entered correctly.');
    }
  });

  // TODO(burdon): Initial url has index.html, which must be caught/redirected.
  log.info('native setup complete');
};

// TODO(burdon): Move to util.
export const safeParseJson = <T extends object>(data: string | undefined | null, defaultValue: T): T => {
  if (data) {
    try {
      return JSON.parse(data);
    } catch (err) {}
  }
  return defaultValue;
};

export const NativePlugin = (): PluginDefinition => ({
  meta,
  ready: async (plugins) => {
    void initializeNativeApp(plugins);
  },
});
