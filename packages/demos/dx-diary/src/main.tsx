//
// Copyright 2020 DXOS.org
//

import { ClientProvider } from '@dxos/react-client';
import React, { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './components';

if ('serviceWorker' in navigator && false) {
  // https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register
  // Must be served from https and have start_url.
  // Register a service worker hosted at the root of the site using the default scope.
  navigator.serviceWorker.register('./sw.js').then((registration) => {
    console.log('Service worker registration succeeded:', registration);
  }, (error) => {
    console.error(`Service worker registration failed: ${error}`);
  });
} else {
  console.error('Service workers are not supported.');
}

const root = createRoot(document.getElementById('root') as HTMLElement);

(() => {
  root.render(
    <StrictMode>
      <ClientProvider
        config={{ runtime: { client: { storage: { persistent: true }} } }}
        onInitialize={async client => {
          // if(!client.halo.profile) {
          //   console.log(await client.halo.createProfile());
          // }
        }}
      >
        <App />
      </ClientProvider>
    </StrictMode>
  );
})();
