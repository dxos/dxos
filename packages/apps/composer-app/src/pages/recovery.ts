//
// Copyright 2026 DXOS.org
//

import { createSqliteProfileArchive, encodeProfileArchive, OPFS_SQLITE_DB_FILENAME } from '@dxos/client-services';
import { mountDevtoolsHooks } from '@dxos/client/devtools';
import * as OpfsPool from '@dxos/sql-sqlite/OpfsPool';

import {
  bootRecoveryClient,
  destroyRecoveryClient,
  exportBootedSqlite,
  isRecoveryClientBooted,
} from '../recovery/boot-client';
import { compactDocumentsInRecovery } from '../recovery/compact-documents';
import { resolveRecoveryDebugOrigin } from '../recovery/constants';
import { runDebugPortLoop } from '../recovery/debug-port';
import { runRecoveryDiagnostics } from '../recovery/diagnostics';
import { downloadRecoveryLogs } from '../recovery/download-logs';
import { attachRecoveryHelpers, getDxos, installDxosGlobals, type RecoveryHelpers } from '../recovery/dxos-globals';
import { importProfileFromUrl, importSqliteInRecovery } from '../recovery/import-sqlite';
import { downloadProfileArchiveExport, exportOpfsSqlite } from '../recovery/opfs-export';
import { resetComposerStorage } from '../recovery/reset-storage';
import { runSqlStorageDiagnostics } from '../recovery/sql-storage-diagnostics';

const logEl = document.getElementById('log')!;
const exportProfileButton = document.getElementById('export-profile') as HTMLButtonElement;
const downloadLogsButton = document.getElementById('download-logs') as HTMLButtonElement;
const importSqliteButton = document.getElementById('import-sqlite') as HTMLButtonElement;
const diagnosticsButton = document.getElementById('diagnostics') as HTMLButtonElement;
const bootComposerButton = document.getElementById('boot-composer') as HTMLButtonElement;
const resetButton = document.getElementById('reset') as HTMLButtonElement;
const debugButton = document.getElementById('debug-port') as HTMLButtonElement;

const print = (message: string) => {
  logEl.textContent += (logEl.textContent ? '\n' : '') + message;
  logEl.scrollTop = logEl.scrollHeight;
};

installDxosGlobals();

const debugOrigin = resolveRecoveryDebugOrigin();

print('Composer recovery mode');
print(`Origin: ${window.location.origin}`);
print('');
print('You are in safe mode — no client, plugins, sync, or indexing until you choose an action.');
print('');
print('Footer actions (left → right):');
print('  Boot    — try opening full Composer at /');
print('  Reset   — wipe all data for this origin (export first!)');
print('  Export  — download .dxprofile backup (SQLite + origin metadata)');
print('  Import  — restore .dxprofile or raw .sqlite into this origin');
print('  Logs    — download NDJSON logs for debugging');
print('  Debug Port — let an agent run commands via composer-recovery.js');
print('');
print('Header: Diagnostics — OPFS storage first, then client identity and spaces');
print('');
print('Typical flows:');
print("  App won't boot → Export → offline forensics → Import");
print('  Need agent help → Debug Port → copy session id from log when it appears');
print('');
print(`Debug port server: ${debugOrigin}`);
if (window.location.protocol === 'https:') {
  print('HTTPS page → run agent with COMPOSER_RECOVERY_HTTPS=1 and mkcert-trusted cert.');
} else {
  print('HTTP page → plain HTTP debug server is fine.');
}
print('After opening Debug Port:');
print('  node composer-recovery.js --session <id> "return dxos.recovery.status()"');
print('  node composer-recovery.js --session <id> "return await dxos.recovery.sqlDiagnostics()"');

let debugAbort: AbortController | undefined;

const exportProfileArchiveBytes = async (): Promise<Uint8Array> => {
  const archiveOptions = { origin: window.location.host };
  if (isRecoveryClientBooted()) {
    const database = await exportBootedSqlite();
    return encodeProfileArchive(createSqliteProfileArchive(OPFS_SQLITE_DB_FILENAME, database, archiveOptions));
  }
  const database = await exportOpfsSqlite();
  return encodeProfileArchive(createSqliteProfileArchive(OPFS_SQLITE_DB_FILENAME, database, archiveOptions));
};

const recoveryHelpers: RecoveryHelpers = {
  booted: isRecoveryClientBooted,
  startClient: async () => {
    print('Starting minimal client (no replication, no auto-activate spaces)…');
    const started = performance.now();
    const client = await bootRecoveryClient();
    attachRecoveryHelpers(recoveryHelpers);
    print(`Client started in ${(performance.now() - started).toFixed(0)} ms — dxos.client available`);
    return { identity: client.halo.identity.get()?.identityKey.truncate() };
  },
  /** @deprecated Use {@link RecoveryHelpers.startClient}. */
  boot: async () => recoveryHelpers.startClient(),
  diagnostics: async () => {
    const result = await runRecoveryDiagnostics(print);
    attachRecoveryHelpers(recoveryHelpers);
    return result;
  },
  sqlDiagnostics: async () => {
    if (isRecoveryClientBooted()) {
      print('Stopping recovery client before OPFS read…');
      await destroyRecoveryClient();
      mountDevtoolsHooks({});
      print('');
    }
    const result = await runSqlStorageDiagnostics(print);
    attachRecoveryHelpers(recoveryHelpers);
    return result;
  },
  exportProfile: async () => {
    const bytes = await exportProfileArchiveBytes();
    downloadProfileArchiveExport(bytes);
    return { byteLength: bytes.byteLength };
  },
  exportSqlite: async () => recoveryHelpers.exportProfile(),
  downloadLogs: downloadRecoveryLogs,
  importSqlite: importSqliteInRecovery,
  importProfileFromUrl,
  reset: async () => {
    await destroyRecoveryClient();
    mountDevtoolsHooks({});
    attachRecoveryHelpers(recoveryHelpers);
    await resetComposerStorage(print);
  },
  log: (message: string) => print(String(message)),
  status: () => ({
    origin: window.location.origin,
    booted: isRecoveryClientBooted(),
    hasClient: Boolean(getDxos().client),
  }),
  inspectOpfsPool: OpfsPool.listFiles,
  compactDocuments: async (options) => {
    print('Compacting linked Automerge documents (epoch migration)…');
    const started = performance.now();
    const result = await compactDocumentsInRecovery(options);
    print(
      `Compacted ${result.compacted.length} document(s) in space ${result.spaceId} ` +
        `(epoch ${result.epochNumber}, ${(performance.now() - started).toFixed(0)} ms)`,
    );
    if (result.skipped.length > 0) {
      print(`Skipped ${result.skipped.length} id(s): ${result.skipped.join(', ')}`);
    }
    return result;
  },
};

attachRecoveryHelpers(recoveryHelpers);

const setBusy = (busy: boolean) => {
  exportProfileButton.disabled = busy;
  downloadLogsButton.disabled = busy;
  importSqliteButton.disabled = busy;
  resetButton.disabled = busy;
  debugButton.disabled = busy;
  diagnosticsButton.disabled = busy;
};

exportProfileButton.addEventListener('click', () => {
  void (async () => {
    setBusy(true);
    try {
      print('Exporting profile archive (.dxprofile with SQLite entry)…');
      const started = performance.now();
      const { byteLength } = await recoveryHelpers.exportProfile();
      print(`Exported ${byteLength.toLocaleString()} bytes in ${(performance.now() - started).toFixed(0)} ms`);
    } catch (error) {
      print(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  })();
});

downloadLogsButton.addEventListener('click', () => {
  void (async () => {
    setBusy(true);
    try {
      print('Downloading logs from IDB log collector…');
      const started = performance.now();
      const { byteLength } = await recoveryHelpers.downloadLogs();
      print(`Downloaded ${byteLength.toLocaleString()} bytes in ${(performance.now() - started).toFixed(0)} ms`);
    } catch (error) {
      print(`Download logs failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  })();
});

importSqliteButton.addEventListener('click', () => {
  if (
    !confirm(
      'Import a .dxprofile (SQLITE_DATABASE entry) or raw .sqlite file into this origin.\n\nThis overwrites the OPFS DXOS database. Reset first if you need a clean import.\n\nContinue?',
    )
  ) {
    print('Import aborted.');
    return;
  }

  void (async () => {
    setBusy(true);
    try {
      print('Select .dxprofile or .sqlite file…');
      print('Importing via OPFS worker (may take a minute for large profiles)…');
      const { byteLength } = await recoveryHelpers.importSqlite();
      attachRecoveryHelpers(recoveryHelpers);
      print(`Imported ${byteLength.toLocaleString()} bytes — run Diagnostics to verify.`);
    } catch (error) {
      print(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  })();
});

diagnosticsButton.addEventListener('click', () => {
  void (async () => {
    setBusy(true);
    try {
      await recoveryHelpers.diagnostics();
    } catch (error) {
      print(`Diagnostics failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  })();
});

bootComposerButton.addEventListener('click', () => {
  print('Booting Composer…');
  window.location.href = '/';
});

resetButton.addEventListener('click', () => {
  if (
    !confirm(
      'This will WIPE ALL DATA for this origin (localStorage, IndexedDB, OPFS, cookies, caches, service workers).\n\nContinue?',
    )
  ) {
    print('Reset aborted.');
    return;
  }

  void (async () => {
    setBusy(true);
    try {
      await recoveryHelpers.reset();
    } finally {
      setBusy(false);
    }
  })();
});

debugButton.addEventListener('click', () => {
  if (debugAbort) {
    debugAbort.abort();
    debugAbort = undefined;
    debugButton.textContent = 'Open Debug Port';
    print('Debug port stopped.');
    setBusy(false);
    return;
  }

  const session = crypto.randomUUID();
  debugAbort = new AbortController();
  debugButton.textContent = 'Stop Debug Port';
  setBusy(true);
  debugButton.disabled = false;

  void (async () => {
    try {
      await runDebugPortLoop({
        session,
        evalCommand: async (code) => {
          const dxos = getDxos();
          // eslint-disable-next-line no-new-func, @typescript-eslint/no-implied-eval -- recovery debug port; user/agent initiated only.
          const runner = new Function('dxos', 'recovery', `"use strict"; return (async () => { ${code} })();`);
          return runner(dxos, recoveryHelpers);
        },
        onLog: print,
        signal: debugAbort?.signal,
      });
    } catch (error) {
      if (debugAbort?.signal.aborted) {
        return;
      }
      print(`Debug port error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      debugAbort = undefined;
      debugButton.textContent = 'Open Debug Port';
      setBusy(false);
    }
  })();
});
