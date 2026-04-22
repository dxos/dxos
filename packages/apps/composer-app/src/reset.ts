//
// Copyright 2025 DXOS.org
//

import { clearCaches, clearIndexedDB, clearOPFS, clearServiceWorkers } from '@dxos/util';

const pre = document.getElementById('log')!;
const print = (msg: string) => {
  pre.textContent += '\n' + msg;
};

if (
  !confirm(
    'This will WIPE ALL DATA for this origin (localStorage, IndexedDB, OPFS, cookies, caches, service workers).\n\nContinue?',
  )
) {
  print('Aborted.');
  throw new Error('aborted');
}

print('Clearing all storage...');

void (async () => {
  localStorage.clear();
  sessionStorage.clear();
  print('localStorage and sessionStorage cleared');

  await clearIndexedDB();
  print('IndexedDB cleared');

  await clearOPFS();
  print('OPFS cleared');

  await clearServiceWorkers();
  print('Service workers unregistered');

  await clearCaches();
  print('Caches cleared');

  document.cookie.split(';').forEach((c) => {
    const name = c.trim().split('=')[0];
    if (name) {
      document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
    }
  });
  print('Cookies cleared');

  print('\nDone. Navigate to / to restart.');
})();
