//
// Copyright 2023 DXOS.org
//

import { random } from '../core';
import { type Range, toRange } from '../util';

// TODO(burdon): Better to use date-fms.
export const date = {
  recent: (range: Range = { min: Date.now() - 24 * 3600 * 1000, max: Date.now() }): Date => {
    const { min, max } = toRange(range, Date.now());
    return new Date(min + random() * (max - min));
  },
};
