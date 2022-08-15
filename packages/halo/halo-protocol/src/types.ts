//
// Copyright 2022 DXOS.org
//

import { TYPES } from './proto/gen';

export type MessageType = {
  [K in keyof TYPES]: TYPES[K] & { '@type': K }
}[keyof TYPES]
