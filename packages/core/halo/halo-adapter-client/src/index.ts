//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { type Client } from '@dxos/client';
import { type Identity, type Space } from '@dxos/halo';

import { layerIdentity } from './identity.ts';
import { layerSpace } from './space.ts';

export { layerIdentity, makeIdentityService } from './identity.ts';
export { layerSpace, makeSpaceService } from './space.ts';

/**
 * A single layer providing both HALO services ({@link Identity.Service}, {@link Space.Service})
 * backed by one {@link Client}. This is the composition-root layer that replaces direct
 * `@dxos/client` access for HALO concerns. Invitation querying lives on these two services;
 * flow-level verbs need no service.
 */
export const layerClient = (client: Client): Layer.Layer<Identity.Service | Space.Service> =>
  Layer.mergeAll(layerIdentity(client), layerSpace(client));
