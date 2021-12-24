//
// Copyright 2021 DXOS.org
//

// TODO(burdon): Print version.
// http://patorjk.com/software/taag/#p=testall&f=Patorjk-HeX&t=DXOS
const BANNER = '\n' +
  '___/\\/\\/\\/\\/\\____/\\/\\____/\\/\\____/\\/\\/\\/\\______/\\/\\/\\/\\___\n' +
  '___/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\____/\\/\\__/\\/\\_________\n' +
  '___/\\/\\____/\\/\\______/\\/\\______/\\/\\____/\\/\\____/\\/\\/\\_____\n' +
  '___/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\____/\\/\\________/\\/\\___\n' +
  '___/\\/\\/\\/\\/\\____/\\/\\____/\\/\\____/\\/\\/\\/\\____/\\/\\/\\/\\_____\n\n' +
  '                           DXOS Client \n\n';

let bannerPrinted = false;

export function printBanner () {
  if (bannerPrinted) {
    return;
  }

  bannerPrinted = true;
  console.log(BANNER);
}
