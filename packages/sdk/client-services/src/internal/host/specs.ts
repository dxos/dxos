//
// Copyright 2026 DXOS.org
//

import * as LayerSpec from '@dxos/compute/LayerSpec';

import * as Echo from '../echo/index.ts';
import * as Halo from '../halo/index.ts';
import * as Kernel from '../kernel/index.ts';
import * as Mesh from '../mesh/index.ts';
import { RpcRouterSpec } from './bindings.ts';
import { DevtoolsHostRegistrationSpec, DevtoolsHostSpec } from './devtools/devtools.ts';
import { LoggingServiceRegistrationSpec, LoggingServiceSpec } from './logging/logging-service.ts';
import { type ServiceStackServices } from './service-stack.ts';
import { SystemServiceRegistrationSpec, SystemServiceSpec } from './system/system-service.ts';

/**
 * Subduction needs the edge clients as well as the feature flag: the flag is set in config profiles
 * that configure no edge endpoint, and requiring a tag nothing provides would prune the specs that
 * declare it — silently taking the data space manager, and every service built on it, with them.
 */
const subductionEnabled = (options: ServiceStackServices): boolean =>
  !!options.edgeFeatures?.subductionReplicator && !!options.edgeAvailable;

/**
 * The client stack as {@link LayerSpec.LayerSpec}s for a `LayerStack` to aggregate: each spec
 * declares the tags it needs and the tags it provides, so build order — and which specs are built at
 * all — follows from the graph rather than from a hand-written `provideMerge` chain.
 *
 * Two conventions carry the behaviour the chain used to encode:
 *
 * - A spec whose point is a side effect provides no tag for anyone to request (a lifecycle
 *   subscription, an rpc registration, a replicator attaching itself to the echo host), so it is
 *   `eager`.
 * - Anything conditional is conditional *within* a spec: a spec that needs the edge requires the
 *   edge tags, which the embedder supplies ambiently only with an endpoint configured, and an
 *   unsatisfied requirement prunes the spec.
 *
 * Each subsystem owns the specs for its own layers and narrows the stack's options to the fields it
 * reads, so this is a composition of four lists rather than a description of the whole package.
 *
 * The embedder supplies `ConfigService`, `Hook.Controller`, the SQL services, the platform inputs
 * and — when configured — the edge clients as the stack's ambient services.
 */
export const clientServiceSpecs = (options: ServiceStackServices): LayerSpec.LayerSpec[] => [
  ...Kernel.specs(),
  ...Mesh.specs({ ...options, edgeSignaling: !!options.edgeFeatures?.signaling }),
  ...Echo.specs({ ...options, subductionEnabled: subductionEnabled(options) }),
  ...Halo.specs(options),

  // The host's own: the router, and the services that introspect the stack rather than serve a
  // subsystem of it.
  RpcRouterSpec,
  SystemServiceSpec,
  SystemServiceRegistrationSpec,
  LoggingServiceSpec,
  LoggingServiceRegistrationSpec,
  DevtoolsHostSpec,
  DevtoolsHostRegistrationSpec,
];
