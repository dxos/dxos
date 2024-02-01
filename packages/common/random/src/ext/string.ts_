//
// Copyright 2023 DXOS.org
//

import { type } from './type';
import { util } from '../util';

export const string = {
  hexadecimal: ({ length = 1 }: { length?: number } = {}) => '0x' + util.multiple(length, type.hex).join(''),

  uuid: (): string =>
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
      .replace(/x/g, () => type.hex({ min: 0x0, max: 0xf }))
      .replace(/y/g, () => type.hex({ min: 0x8, max: 0xb })),
};
