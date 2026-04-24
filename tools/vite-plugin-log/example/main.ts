//
// Copyright 2026 DXOS.org
//

// Minimal entry used by the transform-meta probe in vite.config.ts.
// Keeps the dependency graph small so the plugin transform fires against
// plain user code, not pre-built dist artifacts.

const log = (...args: unknown[]) => console.log(...args);

class TestThing {
  info() {
    log('Info message from example app', { timestamp: Date.now() });
  }

  warn() {
    log('Warning message from example app', { level: 'warn' });
  }

  error() {
    const error = new Error('Test error');
    (error as any).context = { custom: 'custom context' };
    log('Error message from example app', { error });
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

log('Example app initialized');
setupButtons();
