//
// Copyright 2020 DXOS.org
//

import React from 'react';
import { render } from 'react-dom';

import { App } from './components';

if ('serviceWorker' in navigator) {
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

(() => {
  render(
    <App />,
    document.getElementById('root')
  );
})();
