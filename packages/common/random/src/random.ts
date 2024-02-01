//
// Copyright 2023 DXOS.org
//

import { seed } from '@ngneat/falso';

import { util } from './util';

// TODO(burdon): Test tree shaking.
// TODO(burdon): Markdown extension.
// TODO(burdon): Echo extensions.
// TODO(burdon): Real-world data via falso? But will have different seed!
export const random = {
  seed,
  util,
};
