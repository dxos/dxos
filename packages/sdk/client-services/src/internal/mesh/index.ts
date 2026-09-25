//
// Copyright 2026 DXOS.org
//

import * as LayerSpec from '@dxos/compute/LayerSpec';

import { EdgeClientsSpec, SignalManagerSpec, TransportFactorySpec } from './bindings.ts';
import { type Options } from './interface.ts';
import { NetworkLifecycleSpec, SwarmNetworkManagerSpec } from './network-lifecycle.ts';
import { NetworkServiceRegistrationSpec, NetworkServiceSpec } from './network-service.ts';

export * from './bindings.ts';
export * from './interface.ts';
export * from './network-lifecycle.ts';
export * from './network-service.ts';

/**
 * Signalling, transport and the swarm, as the specs the host aggregates.
 */
export const specs = (options: Options): LayerSpec.LayerSpec[] => [
  ...(options.edgeAvailable ? [EdgeClientsSpec] : []),
  SignalManagerSpec(options),
  TransportFactorySpec(options),
  SwarmNetworkManagerSpec(options),
  NetworkLifecycleSpec(options),
  NetworkServiceSpec,
  NetworkServiceRegistrationSpec,
];
