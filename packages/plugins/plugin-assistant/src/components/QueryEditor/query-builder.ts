//
// Copyright 2025 DXOS.org
//

import { type Tree } from '@lezer/common';

import { Filter } from '@dxos/client/echo';

export const buildQuery = (_tree: Tree): Filter.Any => {
  return Filter.everything();
};
