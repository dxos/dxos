//
// Copyright 2026 DXOS.org
//

/**
 * Stable identifier for this process/tab lifetime.
 *
 * Single source for session correlation across telemetry surfaces: the observability
 * OTEL resource attribute (`session.id`) and the edge-client transport metadata
 * (HTTP header / WS query param) must carry the SAME value so that client and edge
 * spans of one session can be joined by attribute query in SigNoz
 * (SC-2 in docs/design/tracing-improvement-spec.md).
 */
export const SESSION_ID: string =
  globalThis.crypto?.randomUUID?.() ?? `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
