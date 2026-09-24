//
// Copyright 2026 DXOS.org
//

import { type DevtoolsHook, mountDevtoolsHooks } from '@dxos/client/devtools';
import { type CompactDocumentsResult } from '@dxos/migrations';

import { type RecoveryDiagnosticsResult } from './diagnostics.ts';
import { type SqlStorageDiagnosticsResult } from './sql-storage-diagnostics.ts';

/** Static devtools globals only — no Client until {@link bootRecoveryClient}. */
export const installDxosGlobals = (): DevtoolsHook => {
  mountDevtoolsHooks({});
  return getDxos();
};

export const getDxos = (): DevtoolsHook => {
  const dxos = (globalThis as { dxos?: DevtoolsHook }).dxos;
  if (!dxos) {
    throw new Error('dxos globals not installed');
  }
  return dxos;
};

export type RecoveryHelpers = {
  booted: () => boolean;
  startClient: () => Promise<unknown>;
  /** @deprecated Use {@link startClient}. */
  boot: () => Promise<unknown>;
  diagnostics: () => Promise<RecoveryDiagnosticsResult>;
  /** OPFS pool + SQLite only — no client boot (safe when feed open hangs). */
  sqlDiagnostics: () => Promise<SqlStorageDiagnosticsResult>;
  /** Raw OPFS SQLite export (`DXOS.sqlite`). */
  exportProfile: () => Promise<{ byteLength: number; saved: boolean }>;
  downloadLogs: () => Promise<{ byteLength: number; saved: boolean }>;
  importSqlite: () => Promise<{ byteLength: number }>;
  importProfileFromUrl: (url: string) => Promise<{ byteLength: number; opfsFilename: string }>;
  reset: () => Promise<void>;
  log: (message: string) => void;
  status: () => Record<string, unknown>;
  compactDocuments: (options?: {
    spaceId?: string;
    objectIds?: string[];
  }) => Promise<CompactDocumentsResult & { spaceId: string }>;
  /** @deprecated Use {@link exportProfile}. */
  exportSqlite: () => Promise<{ byteLength: number; saved: boolean }>;
  inspectOpfsPool: () => Promise<
    Array<{ name: string; associatedPath: string; totalBytes: number; payloadBytes: number }>
  >;
};

export const attachRecoveryHelpers = (helpers: RecoveryHelpers): void => {
  const dxos = getDxos() as DevtoolsHook & { recovery?: RecoveryHelpers };
  dxos.recovery = helpers;
};
