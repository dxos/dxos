//
// Copyright 2026 DXOS.org
//

import { mountDevtoolsHooks } from '@dxos/client/devtools';

import { resolveRecoveryDebugOrigin } from './recovery/constants';
import {
  attachRecoveryHelpers,
  getDxos,
  installDxosGlobals,
  type RecoveryHelpers,
} from './recovery/dxos-globals';
import { runDebugPortLoop } from './recovery/debug-port';
import { bootRecoveryClient, destroyRecoveryClient, exportBootedSqlite, isRecoveryClientBooted } from './recovery/boot-client';
import { compactDocumentsInRecovery } from './recovery/compact-documents';
import { downloadSqliteExport, exportOpfsSqlite } from './recovery/opfs-export';
import { resetComposerStorage } from './recovery/reset-storage';

const logEl = document.getElementById('log')!;
const exportButton = document.getElementById('export-sqlite') as HTMLButtonElement;
const bootButton = document.getElementById('boot') as HTMLButtonElement;
const resetButton = document.getElementById('reset') as HTMLButtonElement;
const debugButton = document.getElementById('debug-port') as HTMLButtonElement;

const print = (message: string) => {
  logEl.textContent += (logEl.textContent ? '\n' : '') + message;
  logEl.scrollTop = logEl.scrollHeight;
};

installDxosGlobals();
print('Composer recovery mode');
print(`Origin: ${window.location.origin}`);
print('Static dxos globals installed (Filter, Obj, DXN, …). No client until Boot.');
print('');
const debugOrigin = resolveRecoveryDebugOrigin();
print(`Debug port: ${debugOrigin}`);
if (window.location.protocol === 'https:') {
  print('HTTPS page → use COMPOSER_RECOVERY_HTTPS=1 with mkcert-trusted cert.');
} else {
  print('HTTP page → plain HTTP server is fine.');
}
print('Debug: node composer-recovery.js "return dxos.recovery.status()"');

let debugAbort: AbortController | undefined;

const exportSqliteBytes = async (): Promise<Uint8Array> => {
  if (isRecoveryClientBooted()) {
    return exportBootedSqlite();
  }
  return exportOpfsSqlite();
};

const recoveryHelpers: RecoveryHelpers = {
  booted: isRecoveryClientBooted,
  boot: async () => {
    print('Booting minimal client (no replication, no auto-activate spaces)…');
    const started = performance.now();
    const client = await bootRecoveryClient();
    attachRecoveryHelpers(recoveryHelpers);
    print(`Booted in ${(performance.now() - started).toFixed(0)} ms — dxos.client available`);
    bootButton.textContent = 'Booted';
    bootButton.disabled = true;
    return { identity: client.halo.identity.get()?.identityKey.truncate() };
  },
  exportSqlite: async () => {
    const bytes = await exportSqliteBytes();
    downloadSqliteExport(bytes);
    return { byteLength: bytes.byteLength };
  },
  reset: async () => {
    await destroyRecoveryClient();
    mountDevtoolsHooks({});
    attachRecoveryHelpers(recoveryHelpers);
    bootButton.textContent = 'Boot';
    bootButton.disabled = false;
    await resetComposerStorage(print);
  },
  log: (message: string) => print(String(message)),
  status: () => ({
    origin: window.location.origin,
    booted: isRecoveryClientBooted(),
    hasClient: Boolean(getDxos().client),
  }),
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
  exportButton.disabled = busy;
  resetButton.disabled = busy;
  debugButton.disabled = busy;
  if (!isRecoveryClientBooted()) {
    bootButton.disabled = busy;
  }
};

exportButton.addEventListener('click', () => {
  void (async () => {
    setBusy(true);
    try {
      print('Exporting SQLite…');
      const started = performance.now();
      const { byteLength } = await recoveryHelpers.exportSqlite();
      print(`Exported ${byteLength.toLocaleString()} bytes in ${(performance.now() - started).toFixed(0)} ms`);
    } catch (error) {
      print(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setBusy(false);
    }
  })();
});

bootButton.addEventListener('click', () => {
  void (async () => {
    setBusy(true);
    try {
      await recoveryHelpers.boot();
    } catch (error) {
      print(`Boot failed: ${error instanceof Error ? error.message : String(error)}`);
      bootButton.disabled = false;
      bootButton.textContent = 'Boot';
    } finally {
      setBusy(false);
    }
  })();
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
          // eslint-disable-next-line no-new-func -- recovery debug port; user/agent initiated only.
          const runner = new Function(
            'dxos',
            'recovery',
            `"use strict"; return (async () => { ${code} })();`,
          );
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
