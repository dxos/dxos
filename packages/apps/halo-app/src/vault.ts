//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { registerSW } from 'virtual:pwa-register';

import { Config, Defaults } from '@dxos/config';
import { initializeAppTelemetry } from '@dxos/react-appkit/telemetry';
import { startIFrameRuntime } from '@dxos/vault';

import { namespace } from './util';

// Chromium & Firefox when running cross-domain, updates are automatically installed on reload.
// Webkit does not seem to have this behaviour.

// https://vite-plugin-pwa.netlify.app/frameworks/
// https://github.com/vite-pwa/vite-plugin-pwa/blob/main/types/index.d.ts
// https://github.com/vite-pwa/vite-plugin-pwa/blob/d4afb9133b585adb4cc66fd6e4b1ce5ab711c2be/examples/vanilla-ts-no-ip/src/main.ts
const x = registerSW({
  // https://developer.chrome.com/docs/workbox/reference/workbox-window/
  // By default this method delays registration until after the window has loaded.
  immediate: true,
  onNeedRefresh: () => {
    // This is fired once per page load when a new version is available.
    console.log('onNeedRefresh message');
  },
  onOfflineReady: () => {
    // Called when SW is initially installed.
    console.log('onOfflineReady message');
  },
  onRegisteredSW: (x, y) => {
    // This is fired each time the page is loaded.
    console.log('onRegisteredSW message', x, y);
  },
  onRegisterError: (x) => {
    console.log('onRegisterError message', x);
  }
});

console.log('reg16', x);
window.abc = x;

void initializeAppTelemetry({ namespace, config: new Config(Defaults()) });
void startIFrameRuntime(
  () =>
    // NOTE: Url must be within SharedWorker instantiation for bundling to work as expected.
    new SharedWorker(new URL('@dxos/vault/shared-worker', import.meta.url), {
      type: 'module',
      name: 'dxos-vault'
    })
);
