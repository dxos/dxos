//
// Copyright 2023 DXOS.org
//

import { core } from './core';
import { text } from './ext/text';
import { type } from './ext/type';

// TODO(burdon): Extensible.
export const random = {
  ...core,
  text,
  type,
};
