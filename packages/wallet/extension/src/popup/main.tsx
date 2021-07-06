//
// Copyright 2021 DXOS.org
//

import React from 'react';
import ReactDOM from 'react-dom';

import App from './components/App';
import { inDev } from './utils/helpers';

// Application to Render
const app = <App />;

// Render application in DOM
ReactDOM.render(app, document.getElementById('app'));

// Hot module replacement
if (inDev() && module.hot) {
  module.hot.accept();
}
