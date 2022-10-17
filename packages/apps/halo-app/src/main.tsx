//
// Copyright 2020 DXOS.org
//

import '@dxosTheme';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import { FatalError } from './components';

// import debug from 'debug'
// import { log } from '@dxos/log'

// debug.enable('dxos:*')
// log.config.filter='debug'

const root = createRoot(document.getElementById('root')!);

if (typeof SharedWorker !== 'undefined') {
  root.render(
    // <StrictMode>
    <App />
    // </StrictMode>
  );
} else {
  // TODO(wittjosiah): Gracefully fallback to compatibility mode.
  //   Support single app at a time by running client in window with a warning.
  //   Main use case is Android Chrome where an alternative of Firefox can be suggested.
  //   https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker#browser_compatibility
  //   https://bugs.chromium.org/p/chromium/issues/detail?id=154571
  root.render(<FatalError error={new Error('Requires a browser with support for shared workers.')} />);
}
