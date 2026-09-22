//
// Copyright 2025 DXOS.org
//

import * as EffectContext from 'effect/Context';

import { type TransportFactory } from '@dxos/network-manager';

/**
 * Effect service tag for the swarm {@link TransportFactory}.
 */
export class TransportFactoryService extends EffectContext.Service<TransportFactoryService, TransportFactory>()(
  '@dxos/client-services/TransportFactory',
) {}
