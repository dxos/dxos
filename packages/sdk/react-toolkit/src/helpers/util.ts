//
// Copyright 2020 DXOS.org
//

import MobileDetect from 'mobile-detect';

// TODO(burdon): Factor out.
export const isMobile = new MobileDetect(window.navigator.userAgent).mobile();

// TODO(burdon): Factor out.
export const pickUnique = <T>(array: T[], n: number) => {
  const unique: T[] = [];
  while (unique.length < n) {
    const i = Math.floor(Math.random() * array.length);
    if (unique.indexOf(array[i]) === -1) {
      unique.push(array[i]);
    }
  }

  unique.sort((a, b) => (a < b ? -1 : a === b ? 0 : 1));
  return unique;
};

// TODO(burdon): Hack.
export const ordinal = (n: number) =>
  String(n) + (n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th');

// TODO(burdon): Factor out.
export const createDownloadLink = (
  filename: string,
  text: string
): HTMLAnchorElement => {
  const file = new Blob([text], { type: 'text/plain' });
  const element = document.createElement('a');
  element.href = URL.createObjectURL(file);
  element.download = filename;
  return element;
};
