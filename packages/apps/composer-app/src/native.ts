//
// Copyright 2023 DXOS.org
//

import { log } from '@dxos/log';

const module = 'socket:application';

/**
 * Native code for socketsupply app.
 */
export const initializeNativeApp = async () => {
  // Dynamic import required. SocketSupply shell will provide the module.
  const app = await import(/* @vite-ignore */ module);
  const { meta_title: appName } = app.config;

  // TODO(burdon): Copied from Discord thread
  //  https://discord.com/channels/775715380089716778/1156997872743628912/1157000028322279577
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
