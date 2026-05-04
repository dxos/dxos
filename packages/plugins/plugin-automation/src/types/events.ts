//
// Copyright 2025 DXOS.org
//

export namespace AutomationEvents {
  // The legacy `ComputeRuntimeReady` event was removed when the monolithic
  // `AutomationCapabilities.ComputeRuntime` was dissolved into per-service
  // `Capabilities.LayerSpec` contributions. Consumers that previously
  // depended on it should sequence against `ActivationEvents.SetupLayer` or
  // `ActivationEvents.ManagedRuntimeReady` from `@dxos/app-framework`.
}
