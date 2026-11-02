//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capability$ from '@dxos/app-framework/Capability';
import { type Type } from '@dxos/echo';

import * as AppCapabilities from './AppCapabilities.ts';

/**
 * Adapts a module whose default export is a schema list into a module body contributing it.
 * Default export: a manifest loads adapters by URL, like module bodies. Keeps the body's other exports,
 * where hot replacement finds its key.
 */
export default <M extends { default: ReadonlyArray<Type.AnyEntity> }>(module: M) => ({
  ...module,
  default: () => Effect.succeed([Capability$.contribute(AppCapabilities.Schema, module.default)]),
});
