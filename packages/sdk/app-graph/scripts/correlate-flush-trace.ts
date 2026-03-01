#!/usr/bin/env npx tsx
//
// Copyright 2025 DXOS.org
//
// Analysis script: ingest DevTools trace (and optional flush records JSONL).
// Extracts graph-flush marks from the trace and correlates flush windows with
// main-thread long-task waves. When --flush-records is provided, also reports
// top flushes and per-extension stats.
//
// Usage:
//   npx tsx scripts/correlate-flush-trace.ts --trace <trace.json> [--flush-records <flush.jsonl>]
//   With only --trace: uses graph-flush.start/end marks in the trace for correlation.
//

import { readFileSync } from 'fs';

const LONG_TASK_THRESHOLD_MS = 50;
const WAVE_GAP_MS = 100;

type TraceEvent = {
  ts?: number;
  dur?: number;
  name?: string;
  cat?: string;
  ph?: string;
  pid?: number;
  tid?: number;
  args?: { name?: string };
};

type FlushWindowFromTrace = {
  flushId: number;
  startTsUs: number;
  endTsUs: number;
  startMs: number;
  endMs: number;
  durationMs: number;
};

type FlushRecord = {
  flushId: number;
  startTs: number;
  endTs: number;
  durationMs: number;
  dirtyConnectorCount: number;
  iterations: number;
  connectorKeys: ConnectorKeyRecord[];
  timeOriginMs?: number;
};

type ConnectorKeyRecord = {
  key: string;
  sourceId: string;
  relation: string;
  nodesIn: number;
  removedEdgeCount: number;
  addedEdgeCount: number;
  sortEdgeCount: number;
  extensionsCandidateCount?: number;
  extensionsScanned?: number;
  extensionsContributing?: number;
  extensionsSkippedByPrefilter?: number;
  stepMs: { removeEdges: number; addNodes: number; addEdges: number; sortEdges: number };
  extensions: ExtensionRecord[];
};

type ExtensionRecord = {
  extensionId: string;
  pluginId: string;
  sourceId: string;
  relation: string;
  nodeCount: number;
  nodeIdsSample: string[];
  durationMs: number;
};

type FlushPayload = {
  flush: FlushRecord;
  mutationSteps: unknown[];
};

type LongTask = {
  ts: number;
  dur: number;
  tsMs: number;
  endMs: number;
  name?: string;
};

function loadTrace(path: string): TraceEvent[] {
  const raw = readFileSync(path, 'utf-8');
  const data = JSON.parse(raw) as { traceEvents?: TraceEvent[] };
  const events = data.traceEvents ?? (Array.isArray(data) ? data : []);
  return events.filter((e: TraceEvent) => e != null && typeof e.ts === 'number');
}

function getMainThreadTid(events: TraceEvent[]): number | null {
  const meta = events.find(
    (e) => e.name === 'thread_name' && e.args?.name === 'CrRendererMain',
  );
  return meta?.tid ?? null;
}

function extractFlushWindowsFromTrace(events: TraceEvent[]): FlushWindowFromTrace[] {
  const byId = new Map<number, { startTsUs: number; endTsUs?: number }>();
  for (const e of events) {
    const name = e.name ?? '';
    const ts = e.ts ?? 0;
    const m = name.match(/^graph-flush\.start\.(\d+)$/);
    if (m) byId.set(parseInt(m[1], 10), { startTsUs: ts });
    const m2 = name.match(/^graph-flush\.end\.(\d+)$/);
    if (m2) {
      const id = parseInt(m2[1], 10);
      const cur = byId.get(id);
      if (cur) cur.endTsUs = ts;
    }
  }
  const windows: FlushWindowFromTrace[] = [];
  for (const [flushId, { startTsUs, endTsUs }] of byId.entries()) {
    if (endTsUs == null) continue;
    const startMs = startTsUs / 1000;
    const endMs = endTsUs / 1000;
    windows.push({
      flushId,
      startTsUs,
      endTsUs,
      startMs,
      endMs,
      durationMs: endMs - startMs,
    });
  }
  return windows.sort((a, b) => a.startTsUs - b.startTsUs);
}

function extractLongTasks(
  events: TraceEvent[],
  thresholdMs: number,
  mainTid: number | null,
): LongTask[] {
  const thresholdUs = thresholdMs * 1000;
  const tasks: LongTask[] = [];
  for (const event of events) {
    if (mainTid != null && event.tid !== mainTid) continue;
    const dur = event.dur ?? 0;
    if (dur < thresholdUs) continue;
    const ts = event.ts!;
    tasks.push({
      ts,
      dur,
      tsMs: ts / 1000,
      endMs: (ts + dur) / 1000,
      name: event.name,
    });
  }
  return tasks.sort((a, b) => a.ts - b.ts);
}

function clusterWaves(tasks: LongTask[], gapMs: number): LongTask[][] {
  if (tasks.length === 0) return [];
  const waves: LongTask[][] = [];
  let current: LongTask[] = [tasks[0]];
  for (let i = 1; i < tasks.length; i++) {
    const prev = tasks[i - 1];
    const next = tasks[i];
    if (next.tsMs - (prev.tsMs + prev.dur / 1000) <= gapMs) {
      current.push(next);
    } else {
      waves.push(current);
      current = [next];
    }
  }
  waves.push(current);
  return waves;
}

function waveBounds(wave: LongTask[]): { startMs: number; endMs: number; durationMs: number } {
  const startMs = wave[0].tsMs;
  const endMs = Math.max(...wave.map((t) => t.tsMs + t.dur / 1000));
  return { startMs, endMs, durationMs: endMs - startMs };
}

function overlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): number {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

function loadFlushRecordsSync(path: string): FlushRecord[] {
  const records: FlushRecord[] = [];
  const raw = readFileSync(path, 'utf-8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const payload = JSON.parse(trimmed) as FlushPayload;
      if (payload?.flush) records.push(payload.flush);
    } catch {
      // skip invalid lines
    }
  }
  return records;
}

/** Flush start/end in ms (performance.now units). Used with offset for overlap. */
function flushRangeMs(flush: FlushRecord): { startMs: number; endMs: number } {
  return { startMs: flush.startTs, endMs: flush.endTs };
}

function main(): void {
  const args = process.argv.slice(2);
  let tracePath: string | null = null;
  let flushPath: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--trace' && args[i + 1]) {
      tracePath = args[++i];
    } else if (args[i] === '--flush-records' && args[i + 1]) {
      flushPath = args[++i];
    }
  }
  if (!tracePath) {
    console.error('Usage: correlate-flush-trace.ts --trace <trace.json> [--flush-records <flush.jsonl>]');
    process.exit(1);
  }

  const events = loadTrace(tracePath);
  const mainTid = getMainThreadTid(events);
  const longTasks = extractLongTasks(events, LONG_TASK_THRESHOLD_MS, mainTid);
  const waves = clusterWaves(longTasks, WAVE_GAP_MS);
  const traceFlushWindows = extractFlushWindowsFromTrace(events);

  console.log(`\n# Trace: ${tracePath}`);
  console.log(`  Events: ${events.length} | Main-thread long tasks (>=${LONG_TASK_THRESHOLD_MS}ms): ${longTasks.length} (${(longTasks.reduce((s, t) => s + t.dur, 0) / 1000).toFixed(0)}ms total)`);
  console.log(`  Flush marks in trace: ${traceFlushWindows.length} windows`);

  function runReport(flushRecords: FlushRecord[]): void {
    let flushRanges: { flush: FlushRecord | FlushWindowFromTrace; startMs: number; endMs: number }[];

    if (flushRecords.length > 0) {
      const firstFlushStart = flushRecords[0].startTs;
      const firstTaskTs = longTasks.length > 0 ? longTasks[0].tsMs : 0;
      const offset = firstTaskTs - firstFlushStart;
      flushRanges = flushRecords.map((f) => {
        const { startMs, endMs } = flushRangeMs(f);
        return { flush: f, startMs: startMs + offset, endMs: endMs + offset };
      });
    } else {
      flushRanges = traceFlushWindows.map((w) => ({
        flush: w,
        startMs: w.startMs,
        endMs: w.endMs,
      }));
    }

    if (flushRecords.length > 0) {
      console.log('\n## Top flushes by duration (ms)\n');
      const byDuration = [...flushRecords]
        .sort((a, b) => b.durationMs - a.durationMs)
        .slice(0, 15);
      byDuration.forEach((f, i) => {
        console.log(
          `  ${i + 1}. flushId=${f.flushId} durationMs=${f.durationMs.toFixed(2)} connectors=${f.dirtyConnectorCount} iterations=${f.iterations}`,
        );
      });
      const extStats = new Map<
        string,
        { nodeCount: number; durationMs: number; pluginId: string }
      >();
      const keyStats = new Map<
        string,
        { flushes: number; scanned: number; contributing: number; skipped: number; candidates: number }
      >();
      for (const flush of flushRecords) {
        for (const key of flush.connectorKeys) {
          const currentKey = keyStats.get(key.key) ?? {
            flushes: 0,
            scanned: 0,
            contributing: 0,
            skipped: 0,
            candidates: 0,
          };
          currentKey.flushes += 1;
          currentKey.scanned += key.extensionsScanned ?? 0;
          currentKey.contributing += key.extensionsContributing ?? 0;
          currentKey.skipped += key.extensionsSkippedByPrefilter ?? 0;
          currentKey.candidates += key.extensionsCandidateCount ?? 0;
          keyStats.set(key.key, currentKey);

          for (const ext of key.extensions) {
            const cur = extStats.get(ext.extensionId) ?? {
              nodeCount: 0,
              durationMs: 0,
              pluginId: ext.pluginId,
            };
            cur.nodeCount += ext.nodeCount;
            cur.durationMs += ext.durationMs;
            extStats.set(ext.extensionId, cur);
          }
        }
      }
      console.log('\n## Top extensions by node churn\n');
      [...extStats.entries()]
        .sort((a, b) => b[1].nodeCount - a[1].nodeCount)
        .slice(0, 15)
        .forEach(([id, s], i) => {
          console.log(
            `  ${i + 1}. ${id} nodeCount=${s.nodeCount} durationMs=${s.durationMs.toFixed(2)} (${s.pluginId})`,
          );
        });

      console.log('\n## Top connector keys by scanned extensions\n');
      [...keyStats.entries()]
        .sort((a, b) => b[1].scanned - a[1].scanned)
        .slice(0, 15)
        .forEach(([key, stats], i) => {
          const avgScanned = stats.flushes > 0 ? stats.scanned / stats.flushes : 0;
          const avgCandidates = stats.flushes > 0 ? stats.candidates / stats.flushes : 0;
          const avgSkipped = stats.flushes > 0 ? stats.skipped / stats.flushes : 0;
          const avgContributing = stats.flushes > 0 ? stats.contributing / stats.flushes : 0;
          console.log(
            `  ${i + 1}. ${key} flushes=${stats.flushes} avgCandidates=${avgCandidates.toFixed(1)} avgScanned=${avgScanned.toFixed(1)} avgContributing=${avgContributing.toFixed(1)} avgSkipped=${avgSkipped.toFixed(1)}`,
          );
        });
    } else if (traceFlushWindows.length > 0) {
      console.log('\n## Flush windows (from graph-flush marks in trace)\n');
      traceFlushWindows.forEach((w, i) => {
        console.log(
          `  ${i + 1}. flushId=${w.flushId} durationMs=${w.durationMs.toFixed(2)}`,
        );
      });
    }

    console.log('\n## Main-thread long-task waves vs flush windows\n');
    waves.forEach((wave, waveIdx) => {
      const { startMs, endMs, durationMs } = waveBounds(wave);
      const overlapping = flushRanges.filter(
        (r) => overlap(r.startMs, r.endMs, startMs, endMs) > 0,
      );
      const overlapMs = overlapping.reduce(
        (sum, r) => sum + overlap(r.startMs, r.endMs, startMs, endMs),
        0,
      );
      const flushIds = overlapping.map((r) => (r.flush as { flushId: number }).flushId);
      console.log(
        `  Wave ${waveIdx + 1}: durationMs=${durationMs.toFixed(0)} tasks=${wave.length} overlapFlushIds=[${flushIds.join(', ')}] overlapDurationMs=${overlapMs.toFixed(0)}`,
      );
      overlapping.slice(0, 5).forEach((r) => {
        const id = (r.flush as { flushId: number }).flushId;
        const dur = (r.flush as { durationMs: number }).durationMs;
        console.log(`    -> flush ${id} durationMs=${dur.toFixed(0)}`);
      });
    });

    console.log('');
  }

  if (flushPath !== null) {
    const records = loadFlushRecordsSync(flushPath);
    runReport(records);
  } else {
    runReport([]);
  }
}

main();
