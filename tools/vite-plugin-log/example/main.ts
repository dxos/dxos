//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

const setupButtons = () => {
  document.getElementById('btn-info')?.addEventListener('click', () => {
    log.info('Info message from example app', { timestamp: Date.now() });
  });

  document.getElementById('btn-warn')?.addEventListener('click', () => {
    log.warn('Warning message from example app', { level: 'warn' });
  });

  document.getElementById('btn-error')?.addEventListener('click', () => {
    log.error('Error message from example app', { error: new Error('Test error') });
  });

  document.getElementById('btn-debug')?.addEventListener('click', () => {
    log('Debug message from example app', { debug: true });
  });
};

log.info('Example app initialized');
setupButtons();
