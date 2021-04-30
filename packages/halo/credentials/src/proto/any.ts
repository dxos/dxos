//
// Copyright 2020 DXOS.org
//

import { TYPES } from './gen';

// eslint-disable-next-line camelcase
export type WithTypeUrl<T> = T & { __type_url: string }

export interface DecodedAny {
  // eslint-disable-next-line camelcase
  __type_url: string,
  [key: string]: any,
}

export type KnownAny = {
  [K in keyof TYPES]: {
  // eslint-disable-next-line camelcase
  __type_url: K,
} & TYPES[K]
}[keyof TYPES]
