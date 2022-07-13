//
// Copyright 2022 DXOS.org
//

import { Authenticator, AuthPlugin } from '@dxos/credentials';
import { Replicator } from '@dxos/protocol-plugin-replicator';
import { PublicKey } from '@dxos/protocols';

/**
 * Creates authenticator network-protocol plugin that guards access to the replicator.
 */
export const createAuthPlugin = (authenticator: Authenticator, peerId: PublicKey) => new AuthPlugin(peerId.asBuffer(), authenticator, [Replicator.extension]);
