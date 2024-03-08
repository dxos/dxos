//
// Copyright 2021 DXOS.org
//

import { type Client } from '@dxos/client';

// http://patorjk.com/software/taag/#p=testall&f=Patorjk-HeX&t=DXOS
const BANNER = (client: Client) => {
  const commitHash = client.config.get('runtime.app.build.commitHash');
  const hash = commitHash ? ` App Commit ${commitHash} \n` : '';

  return (
    '\n' +
    '_/\\/\\/\\/\\/\\____/\\/\\____/\\/\\____/\\/\\/\\/\\______/\\/\\/\\/\\/\\_\n' +
    '_/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\____/\\/\\__/\\/\\_________\n' +
    '_/\\/\\____/\\/\\______/\\/\\______/\\/\\____/\\/\\____/\\/\\/\\/\\___\n' +
    '_/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\____/\\/\\__________/\\/\\_\n' +
    '_/\\/\\/\\/\\/\\____/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\/\\/\\/\\___\n' +
    `\n DXOS Client ${client.version} \n${hash}`
  );
};

let bannerPrinted = false;

export const printBanner = (client: Client) => {
  if (bannerPrinted) {
    return;
  }

  bannerPrinted = true;
  // eslint-disable-next-line no-console
  console.log(`%c${BANNER(client)}`, 'font-family: monospace;');
};
