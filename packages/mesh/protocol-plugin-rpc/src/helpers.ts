//
// Copyright 2021 DXOS.org
//

import { keyToString } from '@dxos/crypto';
import { Protocol } from '@dxos/protocol';

export const getPeerId = (protocol: Protocol) => {
  const { peerId } = protocol.getSession() ?? {};
  return keyToString(peerId);
};
