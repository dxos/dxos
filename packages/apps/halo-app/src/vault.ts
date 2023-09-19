//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { registerSW } from 'virtual:pwa-register';

import { initializeAppTelemetry } from '@braneframe/plugin-telemetry/headless';
import { Config, Defaults } from '@dxos/config';
import { log } from '@dxos/log';
import { startIFrameRuntime } from '@dxos/vault';

import { namespace } from './namespace';

// https://vite-plugin-pwa.netlify.app/frameworks/
// https://github.com/vite-pwa/vite-plugin-pwa/blob/main/types/index.d.ts
// https://github.com/vite-pwa/vite-plugin-pwa/blob/d4afb9133b585adb4cc66fd6e4b1ce5ab711c2be/examples/vanilla-ts-no-ip/src/main.ts
(window as any).__VAULT__ = {
  update: registerSW({
    // https://developer.chrome.com/docs/workbox/reference/workbox-window/
    // By default this method delays registration until after the window has loaded.
    immediate: true,
    onNeedRefresh: () => {
      // This is fired once per page load when a new version is available.
      log('onNeedRefresh message');
    },
    onOfflineReady: () => {
      // Called when SW is initially installed.
      log('onOfflineReady message');
    },
    onRegisteredSW: (swScriptUrl, registration) => {
      // This is fired each time the page is loaded.
      log('onRegisteredSW message', { swScriptUrl, registration });
    },
    onRegisterError: (error) => {
      log.error('Failed to register vault service worker', error);
    },
  }),
};

void initializeAppTelemetry({ namespace, config: new Config(Defaults()) });
void startIFrameRuntime(
  () =>
    // NOTE: Url must be within SharedWorker instantiation for bundling to work as expected.
    new SharedWorker(new URL('@dxos/vault/shared-worker', import.meta.url), {
      type: 'module',
      name: 'dxos-vault',
    }),
);
