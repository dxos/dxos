//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

class TestThing {
  info() {
    log.info('Info message from example app', { timestamp: Date.now() });
  }

  warn() {
    log.warn('Warning message from example app', { level: 'warn' });
  }

  error() {
    const error = new Error('Test error');
    (error as any).context = { custom: 'custom context' };
    log.error('Error message from example app', { error });
  }

  debug() {
    log('Debug message from example app', { debug: true });
  }
}

const setupButtons = () => {
  document.getElementById('btn-info')?.addEventListener('click', () => {
    new TestThing().info();
  });

  document.getElementById('btn-warn')?.addEventListener('click', () => {
    new TestThing().warn();
  });

  document.getElementById('btn-error')?.addEventListener('click', () => {
    new TestThing().error();
  });

  document.getElementById('btn-debug')?.addEventListener('click', () => {
    new TestThing().debug();
  });
};

log.info('Example app initialized');
setupButtons();
