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
    // Get the CapabilityManager to create a layer for it.
    const capabilityManager = yield* Capability.Service;

    // Get the PluginManager to create a layer for it.
    const pluginManager = yield* Plugin.Service;

    // Trigger setup event so plugins can contribute their layers.
    yield* Plugin.activate(Common.ActivationEvent.SetupLayer);

    // Gather all contributed layers.
    const layers = yield* Capability.getAll(Common.Capability.Layer);

    // Create layers that provide Capability.Service and Plugin.Service.
    const capabilityServiceLayer = Layer.succeed(Capability.Service, capabilityManager);
    const pluginServiceLayer = Layer.succeed(Plugin.Service, pluginManager);

    // Merge all layers including service layers.
    // Layer.mergeAll requires a tuple type, so we use a cast for dynamic arrays.
    const composedLayer =
      layers.length > 0
        ? (Layer.mergeAll as (...args: Layer.Layer<any, any, any>[]) => Layer.Layer<any, any, never>)(
            capabilityServiceLayer,
            pluginServiceLayer,
            ...layers,
          )
        : (Layer.mergeAll as (...args: Layer.Layer<any, any, any>[]) => Layer.Layer<any, any, never>)(
            capabilityServiceLayer,
            pluginServiceLayer,
          );

    // Create the managed runtime from the composed layer.
    const runtime = ManagedRuntime.make(composedLayer) as Common.Capability.ManagedRuntime;

    return Capability.contributes(Common.Capability.ManagedRuntime, runtime);
  }),
);
