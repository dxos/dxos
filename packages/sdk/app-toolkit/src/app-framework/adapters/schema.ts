//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability$ from '@dxos/app-framework/Capability';
import { type Type } from '@dxos/echo';

import * as AppCapabilities from '../AppCapabilities.ts';

/**
 * Adapts a module whose default export is a schema list into a module body contributing it.
 * Default export: a manifest loads adapters by URL, like module bodies.
 */
export default ({ default: values }: { default: ReadonlyArray<Type.AnyEntity> }) => ({
  default: () => Effect.succeed([Capability$.contribute(AppCapabilities.Schema, values)]),
});
