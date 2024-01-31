//
// Copyright 2023 DXOS.org
//

import { core } from './core';
import { text } from './text';
import { type } from './type';

// TODO(burdon): Extensible.
export const random = {
  ...core,
  text,
  type,
};
