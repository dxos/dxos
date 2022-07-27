//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/protocols';

export const getPath = (partyKey?: PublicKey, itemId?: string) => {
  if (!partyKey) {
    return '/';
  }

  return `/${partyKey!.toHex()}/${itemId || ''}`;
};
