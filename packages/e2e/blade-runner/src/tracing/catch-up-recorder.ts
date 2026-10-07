//
// Copyright 2026 DXOS.org
//

import { type RemoteSpan, TRACE_PROCESSOR, type TracingBackend } from '@dxos/tracing';

/** One `catchUpWithEdge` span: a space's whole catch-up with EDGE, across reconnects. */
export type EdgeCatchUp = {
  collectionId: string;
  startedAt: number;
  /** Unset while the catch-up is still open. */
  durationMs?: number;
  outcome?: string;
  episodes?: number;
  reconnects?: number;
};

const CATCH_UP_SPAN_SUFFIX = '.catchUpWithEdge';

/**
 * Records the client's `catchUpWithEdge` spans in-process, so a run reports the latency the
 * dashboard reads without an OTLP collector. Wraps whatever backend is installed rather than
 * replacing it, so other span consumers keep receiving every span.
 */
export const recordEdgeCatchUps = (): EdgeCatchUp[] => {
  const catchUps: EdgeCatchUp[] = [];
  const inner = TRACE_PROCESSOR.tracingBackend;
  const backend: TracingBackend = {
    startSpan: (options) => {
      const span: RemoteSpan = inner.startSpan(options);
      if (!options.name.endsWith(CATCH_UP_SPAN_SUFFIX)) {
        return span;
      }
      const catchUp: EdgeCatchUp = {
        collectionId: String(options.attributes?.['ctx.collectionId'] ?? ''),
        startedAt: Date.now(),
      };
      catchUps.push(catchUp);
      return {
        ...span,
        setAttributes: (attributes) => {
          catchUp.outcome = attributes['ctx.outcome'] ?? catchUp.outcome;
          catchUp.episodes = attributes['ctx.episodes'] ?? catchUp.episodes;
          catchUp.reconnects = attributes['ctx.reconnects'] ?? catchUp.reconnects;
          span.setAttributes?.(attributes);
        },
        end: (endTime) => {
          catchUp.durationMs = (endTime ?? Date.now()) - catchUp.startedAt;
          span.end(endTime);
        },
      };
    },
  };
  TRACE_PROCESSOR.tracingBackend = backend;
  return catchUps;
};
