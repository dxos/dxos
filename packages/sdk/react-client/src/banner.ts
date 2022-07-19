//
// Copyright 2021 DXOS.org
//

import { Client } from '@dxos/client';

// http://patorjk.com/software/taag/#p=testall&f=Patorjk-HeX&t=DXOS
const BANNER = (client: Client) => '\n' +
  '_/\\/\\/\\/\\/\\____/\\/\\____/\\/\\____/\\/\\/\\/\\______/\\/\\/\\/\\/\\_\n' +
  '_/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\____/\\/\\__/\\/\\_________\n' +
  '_/\\/\\____/\\/\\______/\\/\\______/\\/\\____/\\/\\____/\\/\\/\\/\\___\n' +
  '_/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\____/\\/\\__________/\\/\\_\n' +
  '_/\\/\\/\\/\\/\\____/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\/\\/\\/\\___\n' +
  `\n DXOS Client ${client.version} \n`;

let bannerPrinted = false;

export const printBanner = (client: Client) => {
  if (bannerPrinted) {
    return;
  }

  bannerPrinted = true;
  console.log(BANNER(client));
};
