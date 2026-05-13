//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

/**
 * Allows consumers to write trace events to the trace.
 */
export interface TraceService {
  write(events: Event[]): void;
}

/**
 * Single typed trace event.
 */
export interface Event {
  key: string;
  isEphemeral: boolean;
  data: unknown;
}
