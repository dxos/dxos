//
// Copyright 2020 DXOS.org
//

import { TYPES } from './gen';

// eslint-disable-next-line camelcase
export type WithTypeUrl<T> = T & { '@type': string }

export interface DecodedAny {
  // eslint-disable-next-line camelcase
  '@type': string
  [key: string]: any
}

export type KnownAny = {
  [K in keyof TYPES]: {
  // eslint-disable-next-line camelcase
  '@type': K
} & TYPES[K]
}[keyof TYPES]
