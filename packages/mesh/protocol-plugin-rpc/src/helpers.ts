//
// Copyright 2021 DXOS.org
//

import { Protocol } from '@dxos/protocol';

export const getPeerId = (peer: Protocol) => {
  const { peerId } = peer.getSession() ?? {};
  return peerId as string;
};
