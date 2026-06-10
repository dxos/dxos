//
// Copyright 2026 DXOS.org
//

import { SpaceState } from '@dxos/client/echo';
import { mountDevtoolsHooks } from '@dxos/client/devtools';

import { bootRecoveryClient, destroyRecoveryClient, isRecoveryClientBooted } from './boot-client';
import { getDxos } from './dxos-globals';
import { type SqlStorageDiagnosticsResult, runSqlStorageDiagnostics } from './sql-storage-diagnostics';

export type RecoverySpaceSummary = {
  id: string;
  state: string;
};

export type RecoveryDiagnosticsResult = {
  clientStarted: boolean;
  clientError?: string;
  elapsedMs: number;
  sql: SqlStorageDiagnosticsResult;
  identity?: {
    identityKey: string;
    deviceKey?: string;
    displayName?: string;
  };
  spaces: RecoverySpaceSummary[];
};

const formatSpaceState = (state: SpaceState): string => SpaceState[state] ?? String(state);

/**
 * Inspect OPFS + SQLite (no client boot), then boot the recovery client for identity and spaces.
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

  const sql = await runSqlStorageDiagnostics(log);

  log('');
  log('Client (may hang if feed storage is broken — use sqlDiagnostics() to skip this step)');

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
    const device = dxos.halo?.device;
    identity = identityRecord
      ? {
          identityKey: identityRecord.identityKey.toString(),
          deviceKey: device?.deviceKey?.toString(),
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
    sql,
    identity,
    spaces,
  };
};
