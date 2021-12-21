//
// Copyright 2021 DXOS.org
//

let bannerPrinted = false;

export function printBanner () {
  if (bannerPrinted) {
    return;
  }
  bannerPrinted = true;

  console.log('%cDXOS', `
    text-align: center;
    text-shadow: #ddd 4px -4px, #bbb 8px -8px, #999 12px -12px, #777 16px -16px;
    font-size: 10em;padding:10px;
  `);
}
