//
// Copyright 2026 DXOS.org
//

// Minimal dedicated worker used to verify that vite-plugin-log streams worker
// logs to `app.log` (via the HTTP sink, since workers don't have HMR).

import { log } from '@dxos/log';

log.info('Worker booted');

self.addEventListener('message', (event: MessageEvent) => {
  const level = String(event.data);
  switch (level) {
    case 'info': {
      log.info('Info from worker', { ts: Date.now() });
      break;
    }
    case 'warn': {
      log.warn('Warn from worker', { ts: Date.now() });
      break;
    }
    case 'error': {
      log.error('Error from worker', { error: new Error('worker error') });
      break;
    }
    default: {
      log.debug('Unknown command from main', { level });
    }
  }
});
