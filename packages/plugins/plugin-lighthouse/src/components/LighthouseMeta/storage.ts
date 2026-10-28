//
// Copyright 2026 DXOS.org
//

import { type StorageReport } from '../../client/types.ts';

// The storage report is passed through as lighthouse writes it; this reads the parts the storage tab shows.

export type Timed<A> = { value?: A; error?: string; ms: number };

export type Storage = {
  workspace: string;
  disk: { total: number; areas: Array<{ id: string; label: string; what: string; bytes: number; files: number }> };
  snapshots: {
    n: number;
    bytes: number;
    oldest?: string;
    newest?: string;
    a11y: number;
    screenshots: number;
    byBackend: Array<{ key: string; n: number; bytes: number }>;
    byHost: Array<{ key: string; n: number; bytes: number }>;
  };
  cache: Array<{ namespace: string; entries: number; bytes: number; newest?: string }>;
  store: {
    quads?: number;
    graphs?: { all: number; superseded: number };
    extractors: Timed<Array<{ key: string; n: number }>>;
    types: Timed<Array<{ key: string; n: number }>>;
    predicates: Timed<Array<{ key: string; n: number }>>;
    daemon?: { pid?: number; uptimeSeconds?: number; requests?: number };
  };
};

/** A dry run's (or a run's) answer from `POST /storage/snapshots/prune`. */
export type PruneReport = { snapshots: number; bytes: number; cited: number; dryRun: boolean };

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const number = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

const timed = <A>(value: unknown, read: (value: unknown) => A): Timed<A> => {
  const fields = record(value);
  return {
    ms: number(fields.ms),
    ...(fields.value !== undefined ? { value: read(fields.value) } : {}),
    ...(text(fields.error) ? { error: text(fields.error) } : {}),
  };
};

const counts = (value: unknown, key: string, count: string) =>
  list(value).map((item) => ({ key: text(record(item)[key]) ?? '', n: number(record(item)[count]) }));

const sized = (value: unknown, key: string) =>
  list(value).map((item) => ({
    key: text(record(item)[key]) ?? '',
    n: number(record(item).n),
    bytes: number(record(item).bytes),
  }));

/** The storage report's parts as the storage tab reads them; undefined before it has a disk total. */
export const readStorage = (report: StorageReport | undefined): Storage | undefined => {
  if (!report) {
    return undefined;
  }
  const disk = record(report.disk);
  if (disk.total === undefined) {
    return undefined;
  }
  const snapshots = record(report.snapshots);
  const store = record(report.store);
  const graphs = record(record(store.graphs).value);
  const daemon = record(store.daemon);
  return {
    workspace: text(report.workspace) ?? '',
    disk: {
      total: number(disk.total),
      areas: list(disk.areas).map((area) => {
        const fields = record(area);
        return {
          id: text(fields.id) ?? '',
          label: text(fields.label) ?? text(fields.id) ?? '',
          what: text(fields.what) ?? '',
          bytes: number(fields.bytes),
          files: number(fields.files),
        };
      }),
    },
    snapshots: {
      n: number(snapshots.n),
      bytes: number(snapshots.bytes),
      oldest: text(snapshots.oldest),
      newest: text(snapshots.newest),
      a11y: number(snapshots.a11y),
      screenshots: number(snapshots.screenshots),
      byBackend: sized(snapshots.byBackend, 'backend'),
      byHost: sized(snapshots.byHost, 'host'),
    },
    cache: list(report.cache).map((entry) => {
      const fields = record(entry);
      return {
        namespace: text(fields.namespace) ?? '',
        entries: number(fields.entries),
        bytes: number(fields.bytes),
        newest: text(fields.newest),
      };
    }),
    store: {
      quads: typeof record(store.size).value === 'number' ? number(record(store.size).value) : undefined,
      graphs: graphs.all !== undefined ? { all: number(graphs.all), superseded: number(graphs.superseded) } : undefined,
      extractors: timed(store.extractors, (value) => counts(value, 'extractor', 'graphs')),
      types: timed(store.types, (value) => counts(value, 'type', 'subjects')),
      predicates: timed(store.predicates, (value) => counts(value, 'predicate', 'quads')),
      daemon: store.daemon
        ? {
            ...(daemon.pid !== undefined ? { pid: number(daemon.pid) } : {}),
            ...(daemon.uptimeSeconds !== undefined ? { uptimeSeconds: number(daemon.uptimeSeconds) } : {}),
            ...(daemon.requests !== undefined ? { requests: number(daemon.requests) } : {}),
          }
        : undefined,
    },
  };
};

/** The prune answer, when the report is one. */
export const readPrune = (report: StorageReport | undefined): PruneReport | undefined =>
  report && typeof report.snapshots === 'number'
    ? {
        snapshots: number(report.snapshots),
        bytes: number(report.bytes),
        cited: number(report.cited),
        dryRun: report.dryRun === true,
      }
    : undefined;

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index++;
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[index]}`;
};

export const formatCount = (count: number): string => count.toLocaleString('en-US');

/** "3 min ago", "2 h ago", "5 d ago"; a dash when there is no time. */
export const ago = (iso: string | undefined, now = Date.now()): string => {
  if (!iso) {
    return '—';
  }
  const seconds = Math.max(0, (now - Date.parse(iso)) / 1000);
  return seconds < 90
    ? `${Math.round(seconds)} s ago`
    : seconds < 5400
      ? `${Math.round(seconds / 60)} min ago`
      : seconds < 129600
        ? `${Math.round(seconds / 3600)} h ago`
        : `${Math.round(seconds / 86400)} d ago`;
};

/** A compact IRI: the part after the last `#` or `/`. */
export const localName = (iri: string): string => iri.replace(/^.*[#/]/, '') || iri;
