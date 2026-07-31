//
// Copyright 2024 DXOS.org
//

import { type Presentation } from '@dxos/protocols/proto/dxos/halo/credentials';

export interface EdgeIdentity {
  peerKey: string;
  /**
   * Identity DID (`did:halo:…`) — the public identity segment of the edge WebSocket path.
   * The router keys connections by the DID.
   */
  identityDid: string;
  /**
   * Returns credential presentation issued by the identity key.
   * Presentation must have the provided challenge.
   * Presentation may include ServiceAccess credentials.
   */
  presentCredentials({ challenge }: { challenge: Uint8Array }): Promise<Presentation>;
}
