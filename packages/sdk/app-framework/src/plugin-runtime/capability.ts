//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import * as Common from '../common';
import { Capability, Plugin } from '../core';

//
// Capability Module
//

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get the PluginContext to create a layer for it.
    const pluginContext = yield* Capability.PluginContextService;

    // Trigger setup event so plugins can contribute their layers.
    yield* Plugin.activate(Common.ActivationEvent.SetupLayer);

    // Gather all contributed layers.
    const layers = yield* Capability.getAll(Common.Capability.Layer);

    // Create layer that provides PluginContextService.
    const pluginContextLayer = Layer.succeed(Capability.PluginContextService, pluginContext);

    // Merge all layers including PluginContextService.
    // Layer.mergeAll requires a tuple type, so we use a cast for dynamic arrays.
    const composedLayer =
      layers.length > 0
        ? (Layer.mergeAll as (...args: Layer.Layer<any, any, any>[]) => Layer.Layer<any, any, never>)(
            pluginContextLayer,
            ...layers,
          )
        : pluginContextLayer;

    // Create the managed runtime from the composed layer.
    const runtime = ManagedRuntime.make(composedLayer) as Common.Capability.ManagedRuntime;

    return Capability.contributes(Common.Capability.ManagedRuntime, runtime);
  }),
);
