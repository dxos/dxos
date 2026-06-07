//
// Copyright 2026 DXOS.org
//

import { isValidSqliteDatabase, OPFS_SQLITE_DB_FILENAME } from '@dxos/client-services';
import { mountDevtoolsHooks } from '@dxos/client/devtools';
import { SpaceState } from '@dxos/client/echo';

import { bootRecoveryClient, destroyRecoveryClient, isRecoveryClientBooted } from './boot-client';
import { getDxos } from './dxos-globals';
import { exportOpfsSqlite } from './opfs-export';

export type RecoverySpaceSummary = {
  id: string;
  state: string;
};

export type RecoveryStorageSummary = {
  origin: string;
  opfsDatabase: string;
  sqliteBytes?: number;
  validSqlite?: boolean;
  error?: string;
};

export type RecoveryDiagnosticsResult = {
  clientStarted: boolean;
  clientError?: string;
  elapsedMs: number;
  storage: RecoveryStorageSummary;
  sqliteBytes?: number;
  identity?: {
    identityKey: string;
    deviceKey?: string;
    displayName?: string;
  };
  spaces: RecoverySpaceSummary[];
};

const formatSpaceState = (state: SpaceState): string => SpaceState[state] ?? String(state);

const readStorageBytes = async (): Promise<Uint8Array> => exportOpfsSqlite();

const printStorageDiagnostics = async (log: (message: string) => void): Promise<RecoveryStorageSummary> => {
  const summary: RecoveryStorageSummary = {
    origin: window.location.origin,
    opfsDatabase: OPFS_SQLITE_DB_FILENAME,
  };

  log('Storage');
  log(`  origin:  ${summary.origin}`);
  log(`  opfs db: ${summary.opfsDatabase}`);

  try {
    const started = performance.now();
    const bytes = await readStorageBytes();
    summary.sqliteBytes = bytes.byteLength;
    summary.validSqlite = isValidSqliteDatabase(bytes);
    log(`  sqlite:  ${summary.sqliteBytes.toLocaleString()} bytes (${(performance.now() - started).toFixed(0)} ms)`);
    log(`  header:  ${summary.validSqlite ? 'valid SQLite 3' : 'invalid or empty'}`);
  } catch (error) {
    summary.error = error instanceof Error ? error.message : String(error);
    log(`  error:   ${summary.error}`);
  }

  return summary;
};

/**
 * Inspect OPFS storage, then boot the recovery client and collect identity and spaces.
 */
export const runRecoveryDiagnostics = async (log: (message: string) => void): Promise<RecoveryDiagnosticsResult> => {
  const started = performance.now();
  log('Running diagnostics…');
  log('');

  if (isRecoveryClientBooted()) {
    log('Stopping recovery client before OPFS read…');
    await destroyRecoveryClient();
    mountDevtoolsHooks({});
    log('');
  }

  const storage = await printStorageDiagnostics(log);

  log('');
  log('Client');

  const clientAlreadyBooted = isRecoveryClientBooted();
  let clientStarted = false;
  let clientError: string | undefined;
  let identity: RecoveryDiagnosticsResult['identity'];
  let spaces: RecoverySpaceSummary[] = [];

  try {
    if (!clientAlreadyBooted) {
      log('  starting minimal client (no replication, no auto-activate spaces)…');
      const bootStarted = performance.now();
      await bootRecoveryClient();
      clientStarted = true;
      log(`  started in ${(performance.now() - bootStarted).toFixed(0)} ms`);
    } else {
      log('  already running');
    }

    const dxos = getDxos();
    const client = dxos.client;
    if (!client) {
      throw new Error('Client unavailable after boot');
    }

    const identityRecord = dxos.halo?.identity.get();
    identity = identityRecord
      ? {
          identityKey: identityRecord.identityKey.toString(),
          deviceKey: identityRecord.deviceKey?.toString(),
          displayName: identityRecord.profile?.displayName,
        }
      : undefined;

    spaces = client.spaces.get().map((space) => ({
      id: space.id,
      state: formatSpaceState(space.state.get()),
    }));

    log('');
    log('Identity');
    if (identity) {
      log(`  key:     ${identity.identityKey}`);
      if (identity.deviceKey) {
        log(`  device:  ${identity.deviceKey}`);
      }
      if (identity.displayName) {
        log(`  name:    ${identity.displayName}`);
      }
    } else {
      log('  (none — profile may be empty or not yet loaded)');
    }

    log('');
    log(`Spaces (${spaces.length})`);
    if (spaces.length === 0) {
      log('  (none registered on this profile)');
    } else {
      for (const space of spaces) {
        log(`  - ${space.id}  [${space.state}]`);
      }
    }
  } catch (error) {
    clientError = error instanceof Error ? error.message : String(error);
    log(`  failed:  ${clientError}`);
  }

  return {
    clientStarted,
    clientError,
    elapsedMs: performance.now() - started,
    storage,
    sqliteBytes: storage.sqliteBytes,
    identity,
    spaces,
  };
};
