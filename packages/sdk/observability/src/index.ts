//
// Copyright 2025 DXOS.org
//

// NOTE: `AiTelemetry` is deliberately absent, unlike the namespaces below — it is a standalone
// entrypoint at `@dxos/observability/AiTelemetry`. Composer's boot imports this barrel, and the
// boot set is the parse graph, so re-exporting the AI sink here would put it on the boot path for
// code only a lazily-activated plugin module uses.

export * as Observability from './observability';
export * as ObservabilityExtension from './observability-extension';
export * as ObservabilityProvider from './providers';
