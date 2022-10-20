//
// Copyright 2021 DXOS.org
//

import EventEmitter from 'events';
import { createRoot } from 'react-dom/client';

import { inDev } from './utils';

export const render = (app: JSX.Element) => {
  const eventEmitter = new EventEmitter();
  if (!eventEmitter.off) {
    throw new Error('off is missing on EventEmitter - insufficient node polyfills.');
  } // Check if `node` polyfills are correct.

  // Render application in DOM.
  createRoot(document.getElementById('app')!)
    .render(app);

  // Hot module replacement.
  if (inDev() && module.hot) {
    module.hot.accept();
  }
};
