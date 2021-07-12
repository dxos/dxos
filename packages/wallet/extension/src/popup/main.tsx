//
// Copyright 2021 DXOS.org
//

import EventEmitter from 'events';
import React from 'react';
import ReactDOM from 'react-dom';

import App from './components/App';
import { inDev } from './utils/helpers';

const ee = new EventEmitter();
if (!ee.off) {
  throw new Error('off is missing on EventEmitter - insufficient node polyfills.');
} // Check if `node` polyfills are correct

// Application to Render
const app = <App />;

// Render application in DOM
ReactDOM.render(app, document.getElementById('app'));

// Hot module replacement
if (inDev() && module.hot) {
  module.hot.accept();
}
