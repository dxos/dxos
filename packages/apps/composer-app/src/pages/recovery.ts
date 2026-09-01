//
// Copyright 2026 DXOS.org
//

import { OPFS_SQLITE_DB_FILENAME, createSqliteProfileArchive, encodeProfileArchive } from '@dxos/client-services';
import { getDebugPortController, mountDevtoolsHooks, resolveDebugPortOrigin } from '@dxos/client/devtools';
import * as OpfsPool from '@dxos/sql-sqlite/OpfsPool';

import {
  type RecoveryAction,
  type RecoveryHelpers,
  attachRecoveryHelpers,
  bootRecoveryClient,
  compactDocumentsInRecovery,
  createRecoveryUi,
  destroyRecoveryClient,
  downloadProfileArchiveExport,
  downloadRecoveryLogs,
  exportBootedSqlite,
  exportOpfsSqlite,
  getDxos,
  importProfileFromUrl,
  importSqliteInRecovery,
  installDxosGlobals,
  isRecoveryClientBooted,
  resetComposerStorage,
  runRecoveryDiagnostics,
  runSqlStorageDiagnostics,
} from '../recovery/index.ts';

const { print, setBusy, setDebugPortActive, onAction } = createRecoveryUi({
  container: document.getElementById('root')!,
});

installDxosGlobals();

const debugOrigin = resolveDebugPortOrigin();

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

const debugPort = getDebugPortController();

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
    const saved = await downloadProfileArchiveExport(bytes);
    return { byteLength: bytes.byteLength, saved };
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

// Busy has two independent sources — a running action and a live debug port — so it is derived
// rather than assigned: clearing it at the end of an action would otherwise hide an agent still
// driving the page.
let actionBusy = false;
let debugPortRunning = false;
const syncBusy = () => setBusy(actionBusy || debugPortRunning);

const runAction = async (label: string, task: () => Promise<void>) => {
  actionBusy = true;
  syncBusy();
  try {
    await task();
  } catch (error) {
    print(`${label} failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    actionBusy = false;
    syncBusy();
  }
};

// The loop can also stop on its own (fatal error), so the button follows the controller rather
// than the click. Busy tracks it too: while an agent is driving, the human should not also click.
debugPort.subscribe(() => {
  const { running } = debugPort.getStatus();
  if (running !== debugPortRunning) {
    debugPortRunning = running;
    setDebugPortActive(running);
    syncBusy();
  }
});

const toggleDebugPort = () => {
  if (debugPort.getStatus().running) {
    debugPort.stop();
  } else {
    debugPort.start({
      // Resolved per command so a client booted mid-session is picked up.
      scope: () => ({ dxos: getDxos(), recovery: recoveryHelpers }),
      onLog: print,
    });
  }
};

const actions: Record<RecoveryAction, () => void> = {
  'diagnostics': () =>
    void runAction('Diagnostics', async () => {
      await recoveryHelpers.diagnostics();
    }),

  'boot': () => {
    print('Booting Composer…');
    window.location.href = '/';
  },

  'reset': () => {
    if (
      !confirm(
        'This will WIPE ALL DATA for this origin (localStorage, IndexedDB, OPFS, cookies, caches, service workers).\n\nContinue?',
      )
    ) {
      print('Reset aborted.');
      return;
    }
    void runAction('Reset', () => recoveryHelpers.reset());
  },

  'export': () =>
    void runAction('Export', async () => {
      print('Exporting profile archive (.dxprofile with SQLite entry)…');
      const started = performance.now();
      const { byteLength, saved } = await recoveryHelpers.exportProfile();
      if (!saved) {
        print('Cancelled.');
        return;
      }
      print(`Exported ${byteLength.toLocaleString()} bytes in ${(performance.now() - started).toFixed(0)} ms`);
    }),

  'import': () => {
    if (
      !confirm(
        'Import a .dxprofile (SQLITE_DATABASE entry) or raw .sqlite file into this origin.\n\nThis overwrites the OPFS DXOS database. Reset first if you need a clean import.\n\nContinue?',
      )
    ) {
      print('Import aborted.');
      return;
    }
    void runAction('Import', async () => {
      print('Select .dxprofile or .sqlite file…');
      print('Importing via OPFS worker (may take a minute for large profiles)…');
      const { byteLength } = await recoveryHelpers.importSqlite();
      attachRecoveryHelpers(recoveryHelpers);
      print(`Imported ${byteLength.toLocaleString()} bytes — run Diagnostics to verify.`);
    });
  },

  'logs': () =>
    void runAction('Download logs', async () => {
      print('Downloading logs from IDB log collector…');
      const started = performance.now();
      const { byteLength, saved } = await recoveryHelpers.downloadLogs();
      if (!saved) {
        print('Cancelled.');
        return;
      }
      print(`Downloaded ${byteLength.toLocaleString()} bytes in ${(performance.now() - started).toFixed(0)} ms`);
    }),

  'debug-port': toggleDebugPort,
};

onAction((action) => actions[action]());
