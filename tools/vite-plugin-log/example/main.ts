//
// Copyright 2026 DXOS.org
//

// Minimal entry used by the transform-meta probe in vite.config.ts.
// Keeps the dependency graph small so the plugin transform fires against
// plain user code, not pre-built dist artifacts.

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

  catch() {
    log.catch(new Error('Test error', { cause: new Error('Cause') }));
  }

  debug() {
    log.debug('Debug message from example app', { debug: true });
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

  document.getElementById('btn-catch')?.addEventListener('click', () => {
    // eslint-disable-next-line @dxos/rules/no-empty-promise-catch
    new TestThing().catch();
  });
};

log.info('Example app initialized');
setupButtons();
