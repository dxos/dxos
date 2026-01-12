//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';

import * as Common from '../common';
import { Capability } from '../core';

//
// Capability Module
//

export default Capability.makeModule((context) =>
  Effect.gen(function* () {
    // Trigger setup event so plugins can contribute their layers.
    yield* context.activate(Common.ActivationEvent.SetupLayer);

    // Gather all contributed layers.
    const layers = context.getCapabilities(Common.Capability.Layer);

    // Merge all layers into a single layer.
    // Layer.mergeAll requires a tuple type, so we use a cast for dynamic arrays.
    const composedLayer =
      layers.length > 0
        ? (Layer.mergeAll as (...args: Layer.Layer<any, any, any>[]) => Layer.Layer<any, any, never>)(...layers)
        : Layer.empty;

    // Create the managed runtime from the composed layer.
    const runtime = ManagedRuntime.make(composedLayer) as Common.Capability.ManagedRuntime;

    return Capability.contributes(Common.Capability.ManagedRuntime, runtime);
  }),
);
