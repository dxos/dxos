//
// Copyright 2026 DXOS.org
//

import { RECOVERY_DEBUG_ORIGIN } from './recovery/constants';
import { runDebugPortLoop } from './recovery/debug-port';
import { downloadSqliteExport, exportOpfsSqlite } from './recovery/opfs-export';
import { resetComposerStorage } from './recovery/reset-storage';

const logEl = document.getElementById('log')!;
const exportButton = document.getElementById('export-sqlite') as HTMLButtonElement;
const resetButton = document.getElementById('reset') as HTMLButtonElement;
const debugButton = document.getElementById('debug-port') as HTMLButtonElement;

const print = (message: string) => {
  logEl.textContent += (logEl.textContent ? '\n' : '') + message;
  logEl.scrollTop = logEl.scrollHeight;
};

print('Composer recovery mode');
print(`Origin: ${window.location.origin}`);
print('No plugins, client, sync, or indexing loaded.');
print('');
print(`Debug port target: ${RECOVERY_DEBUG_ORIGIN}`);
if (window.location.protocol === 'https:') {
  print('Note: HTTPS pages may block localhost fetch (mixed content). Export/Reset still work.');
  print('For debug port on production, use local `vite serve` or a HTTPS recovery server.');
}

let debugAbort: AbortController | undefined;

const setBusy = (busy: boolean) => {
  exportButton.disabled = busy;
  resetButton.disabled = busy;
  debugButton.disabled = busy;
};

/** Global API available to debug-port snippets via `recovery.*`. */
const recovery = {
  status: () => ({
    origin: window.location.origin,
    href: window.location.href,
    userAgent: navigator.userAgent,
  }),
  exportSqlite: async () => {
    const bytes = await exportOpfsSqlite();
    downloadSqliteExport(bytes);
    return { byteLength: bytes.byteLength, downloaded: `${bytes.byteLength} bytes` };
  },
  reset: async () => {
    await resetComposerStorage(print);
  },
  log: (message: string) => print(String(message)),
};

(globalThis as typeof globalThis & { recovery: typeof recovery }).recovery = recovery;

exportButton.addEventListener('click', () => {
  void (async () => {
    setBusy(true);
    try {
      print('Exporting OPFS SQLite (DXOS)…');
      const started = performance.now();
      const bytes = await exportOpfsSqlite();
      downloadSqliteExport(bytes);
      print(`Exported ${bytes.byteLength.toLocaleString()} bytes in ${(performance.now() - started).toFixed(0)} ms`);
    } catch (error) {
      print(`Export failed: ${error instanceof Error ? error.message : String(error)}`);
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
      await resetComposerStorage(print);
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
          // eslint-disable-next-line no-new-func
          const runner = new Function('recovery', `"use strict"; return (async () => { ${code} })();`);
          return runner(recovery);
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
