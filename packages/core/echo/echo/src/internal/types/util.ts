//
// Copyright 2025 DXOS.org
//

import { type BaseObject } from './types';

export type ToMutable<T> = T extends BaseObject
  ? { -readonly [K in keyof T]: T[K] extends readonly (infer U)[] ? U[] : T[K] }
  : T;
