//
// Copyright 2025 DXOS.org
//

/**
 * Stable schema for graph-builder flush and mutation performance measurement.
 * Used to quantify node/edge churn per flush, attribute work to extensions,
 * and correlate with DevTools long-task waves. All measurement is feature-flagged.
 */

declare global {
  interface ImportMeta {
    env: {
      VITE_GRAPH_PERF: string;
    };
  }
}

/**
 * When true, instrumentation records are collected and emitted.
 * Disabled by default in all environments.
 * Enable explicitly via global __DXOS_APP_GRAPH_PERF__ = true or env DXOS_APP_GRAPH_PERF=1.
 */
const _explicitEnable =
  (typeof globalThis !== 'undefined' &&
    (globalThis as unknown as { __DXOS_APP_GRAPH_PERF__?: boolean }).__DXOS_APP_GRAPH_PERF__ === true) ||
  import.meta.env.VITE_GRAPH_PERF === '1';
export const PERF_MEASUREMENT_ENABLED = _explicitEnable;

/** Monotonic flush id (incremented per scheduled flush). */
export type FlushId = number;

/** Per-flush summary record. */
export type FlushRecord = {
  flushId: FlushId;
  startTs: number;
  endTs: number;
  durationMs: number;
  dirtyConnectorCount: number;
  iterations: number;
  connectorKeys: ConnectorKeyRecord[];
  /** When present, trace ts (µs) can be aligned: traceTsMs = ts/1000 - timeOriginMs. */
  timeOriginMs?: number;
};

/** Per-connector-key (sourceId+relation) record within a flush. */
export type ConnectorKeyRecord = {
  key: string;
  sourceId: string;
  relation: string;
  nodesIn: number;
  removedEdgeCount: number;
  addedEdgeCount: number;
  sortEdgeCount: number;
  extensionsCandidateCount: number;
  extensionsScanned: number;
  extensionsContributing: number;
  extensionsSkippedByPrefilter: number;
  stepMs: {
    removeEdges: number;
    addNodes: number;
    addEdges: number;
    sortEdges: number;
  };
  extensions: ExtensionRecord[];
};

/** Per-extension contribution within a connector key update. */
export type ExtensionRecord = {
  extensionId: string;
  pluginId: string;
  sourceId: string;
  relation: string;
  nodeCount: number;
  nodeIdsSample: string[];
  durationMs: number;
};

/** Per-mutation-step record (graph.ts internals). */
export type MutationStepRecord = {
  step:
    | 'addNodes'
    | 'addNode'
    | 'addEdges'
    | 'addEdge'
    | 'removeEdges'
    | 'removeEdge'
    | 'removeNodes'
    | 'removeNode'
    | 'sortEdges';
  count: number;
  durationMs: number;
  orphanPruneCount?: number;
};

/** Wave-correlation: long task window from trace analysis. */
export type LongTaskWave = {
  waveId: string;
  startTs: number;
  endTs: number;
  durationMs: number;
  overlapFlushIds: FlushId[];
  overlapDurationMs: number;
};

/** Full measurement payload for one flush cycle (for logging or diagnostics export). */
export type FlushMeasurementPayload = {
  flush: FlushRecord;
  mutationSteps: MutationStepRecord[];
};

/** Callback to emit flush records (e.g. log, diagnostics channel, in-memory buffer). */
export type FlushMeasurementEmitter = (payload: FlushMeasurementPayload) => void;

let _flushEmitter: FlushMeasurementEmitter | null = null;

/** Set global emitter for flush measurements (when PERF_MEASUREMENT_ENABLED). */
export const setFlushMeasurementEmitter = (emitter: FlushMeasurementEmitter | null): void => {
  _flushEmitter = emitter;
};

/** Get current emitter. */
export const getFlushMeasurementEmitter = (): FlushMeasurementEmitter | null => _flushEmitter;

let _nextFlushId = 0;

/** Allocate next flush id. */
export const nextFlushId = (): FlushId => ++_nextFlushId;

let _mutationStepCollector: MutationStepRecord[] | null = null;

/** Set collector for mutation steps during a flush (graph.ts pushes to this). */
export const setMutationStepCollector = (collector: MutationStepRecord[] | null): void => {
  _mutationStepCollector = collector;
};

/** Get current mutation step collector. */
export const getMutationStepCollector = (): MutationStepRecord[] | null => _mutationStepCollector;

/**
 * Bounded ring buffer of recent flush payloads.
 * Auto-installed as default emitter when PERF_MEASUREMENT_ENABLED and no custom emitter is set.
 * Access from console: __DXOS_APP_GRAPH_FLUSH_LOG__
 */
const MAX_FLUSH_LOG_SIZE = 200;
const _flushLog: FlushMeasurementPayload[] = [];

/** Default emitter: pushes to ring buffer (bounded). */
const _defaultEmitter: FlushMeasurementEmitter = (payload) => {
  _flushLog.push(payload);
  if (_flushLog.length > MAX_FLUSH_LOG_SIZE) {
    _flushLog.shift();
  }
};

/** Get all buffered flush payloads. */
export const getFlushLog = (): FlushMeasurementPayload[] => _flushLog;

/** Clear the flush log buffer. */
export const clearFlushLog = (): void => {
  _flushLog.length = 0;
};

/** Export flush log as JSONL string (one payload per line). */
export const exportFlushLogJsonl = (): string => _flushLog.map((p) => JSON.stringify(p)).join('\n');

if (PERF_MEASUREMENT_ENABLED) {
  setFlushMeasurementEmitter(_defaultEmitter);
  if (typeof globalThis !== 'undefined') {
    (globalThis as unknown as Record<string, unknown>).__DXOS_APP_GRAPH_FLUSH_LOG__ = _flushLog;
    (globalThis as unknown as Record<string, unknown>).__DXOS_APP_GRAPH_EXPORT_FLUSH_LOG__ = exportFlushLogJsonl;
  }
}
