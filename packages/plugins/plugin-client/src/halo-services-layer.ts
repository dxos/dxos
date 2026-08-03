//
// Copyright 2026 DXOS.org
//

import * as Layer from 'effect/Layer';

import { Capability } from '@dxos/app-framework';
import { Identity, Space } from '@dxos/halo';

import { ClientCapabilities } from './types';

/**
 * Provides the canonical `@dxos/halo` services (`Identity.Service` / `Space.Service`) from the
 * client-backed capabilities contributed by this plugin. Consumers depend on the halo services
 * directly and provide this layer, rather than reaching for the capability instances:
 *
 * ```ts
 * yield* Identity.getSnapshot; // requires Identity.Service
 * // provided by:
 * effect.pipe(Effect.provide(HaloServicesLayer));
 * ```
 *
 * The layer itself requires `Capability.Service` (the capability manager), which is in scope inside
 * capability modules and operation handlers.
 */
export const HaloServicesLayer: Layer.Layer<Identity.Service | Space.Service, never, Capability.Service> = Layer.merge(
  Capability.layerWith(ClientCapabilities.IdentityService, (service) => Layer.succeed(Identity.Service, service)),
  Capability.layerWith(ClientCapabilities.SpaceService, (service) => Layer.succeed(Space.Service, service)),
);
