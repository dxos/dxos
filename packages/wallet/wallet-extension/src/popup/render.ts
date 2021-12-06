//
// Copyright 2021 DXOS.org
//

import EventEmitter from 'events';
import ReactDOM from 'react-dom';

import { inDev } from './utils';

export const render = (app: JSX.Element) => {
  const eventEmitter = new EventEmitter();
  if (!eventEmitter.off) {
    throw new Error('off is missing on EventEmitter - insufficient node polyfills.');
  } // Check if `node` polyfills are correct.

  // Render application in DOM.
  ReactDOM.render(app, document.getElementById('app'));

  // Hot module replacement.
  if (inDev() && module.hot) {
    module.hot.accept();
  }
};
