//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';

const module = 'socket:application';

const KEY_WINDOW_SIZE = 'dxos.composer.options.window.size';

/**
 * Native code for socketsupply app.
 */
export const initializeNativeApp = async () => {
  // Dynamic import required. SocketSupply shell will provide the module.
  const app = await import(/* @vite-ignore */ module);
  const { meta_title: appName } = app.config;

  // https://github.com/socketsupply/socket-examples/blob/master/react-dashboard/socket-build/mac/beepboop-dev.app/Contents/Resources/socket/index.d.ts
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

  // https://github.com/socketsupply/socket-examples/blob/master/react-dashboard/socket-build/mac/beepboop-dev.app/Contents/Resources/socket/application.js#L162
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
    console.log(event);
    const id = `${event.detail.parent}:${event.detail.title}`;
    switch (id) {
      case 'App Name:Quit': {
        await app.exit();
        break;
      }
    }
  });

  log.info('initialized');
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
