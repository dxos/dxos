//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { type Client } from '@dxos/client';
import { type Identity, type Invitation, type Space } from '@dxos/halo';

import { layerIdentity } from './identity';
import { layerInvitation } from './invitation';
import { layerSpace } from './space';

export { layerIdentity, makeIdentityService } from './identity';
export { layerInvitation, makeInvitationService } from './invitation';
export { layerSpace, makeSpaceService } from './space';

/**
 * A single layer providing all three HALO services ({@link Identity.Service},
 * {@link Space.Service}, {@link Invitation.Service}) backed by one {@link Client}. This is the
 * composition-root layer that replaces direct `@dxos/client` access for HALO concerns.
 */
export const layerClient = (client: Client): Layer.Layer<Identity.Service | Space.Service | Invitation.Service> =>
  Layer.mergeAll(layerIdentity(client), layerSpace(client), layerInvitation(client));
