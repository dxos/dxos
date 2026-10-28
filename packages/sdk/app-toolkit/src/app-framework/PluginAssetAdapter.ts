//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';

import * as Capability$ from '@dxos/app-framework/Capability';

import * as AppCapabilities from './AppCapabilities.ts';

/** The asset fields a manifest carries as adapter arguments; the content is the loaded module. */
export type Args = Omit<AppCapabilities.PluginAsset, 'content'>;

/**
 * Adapts a text module (typically `PLUGIN.mdl?raw`) into a module body contributing it as an asset.
 * Default export: a manifest loads adapters by URL, like module bodies. Keeps the body's other exports,
 * where hot replacement finds its key.
 */
export default <M extends { default: string }>(module: M, asset: Args) => ({
  ...module,
  default: () =>
    Effect.succeed([Capability$.contribute(AppCapabilities.PluginAsset, { ...asset, content: module.default })]),
});
